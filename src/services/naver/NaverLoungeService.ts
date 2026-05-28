import axios from 'axios';

const HEADERS = {
  'Origin': 'https://game.naver.com',
  'Referer': 'https://game.naver.com/lounge/Trickcal/board/11',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'front-client-platform-type': 'PC',
  'front-client-product-type': 'web',
};

const AXIOS_OPTIONS = {
  headers: HEADERS,
  timeout: 10000,
};

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get<T>(url, AXIOS_OPTIONS);
      return res.data;
    } catch (err: any) {
      const retryable = ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED'].includes(err.code);
      if (!retryable || i === retries - 1) throw err;
      const delay = 2000 * (i + 1);
      console.warn(`[NaverAPI] ${err.code} 발생, ${delay}ms 후 재시도 (${i + 1}/${retries - 1})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

export interface NaverPost {
  id: string;
  title: string;
  createdDate: string;
  updatedDate: string;
  url: string;
  imageUrl?: string;
}

export async function getLatestPosts(): Promise<NaverPost[]> {
  const apiUrl = process.env.NAVER_BOARD_API_URL;
  if (!apiUrl) throw new Error('NAVER_BOARD_API_URL 환경변수가 설정되지 않았습니다.');

  const urls = apiUrl.split(',').map(u => u.trim()).filter(Boolean);

  const results = await Promise.all(urls.map(async (url) => {
    const data = await fetchWithRetry<any>(url);
    const feeds = data?.content?.feeds;
    if (!Array.isArray(feeds)) {
      console.log('[NaverAPI] 예상과 다른 응답:', data);
      return [] as NaverPost[];
    }
    return feeds.map((item: any) => {
      const feed = item.feed;
      return {
        id: String(feed.feedId),
        title: feed.title,
        createdDate: feed.createdDate,
        updatedDate: feed.updatedDate,
        url: `https://game.naver.com/lounge/Trickcal/board/detail/${feed.feedId}`,
        imageUrl: feed.repImageUrl || undefined,
      };
    });
  }));

  const merged = results.flat();
  merged.sort((a, b) => Number(b.id) - Number(a.id));
  return merged;
}

export async function getPostContent(id: string): Promise<string> {
  const baseUrl = process.env.NAVER_ARTICLE_API_BASE_URL;
  if (!baseUrl) return '';
  const data = await fetchWithRetry<any>(`${baseUrl}/${id}`);
  const html: string = data?.content?.feed?.contents ?? '';
  return extractPreview(html);
}

export async function getMaintenanceDetails(id: string): Promise<{ preview: string; compensation: string | null }> {
  const baseUrl = process.env.NAVER_ARTICLE_API_BASE_URL;
  if (!baseUrl) return { preview: '', compensation: null };
  const data = await fetchWithRetry<any>(`${baseUrl}/${id}`);
  const html: string = data?.content?.feed?.contents ?? '';
  return { preview: extractPreview(html), compensation: extractCompensation(html) };
}

function extractCompensation(html: string): string | null {
  const text = decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '));
  const m = text.match(/엘리프\s*(\d[\d,]*)\s*개?|(\d[\d,]*)\s*엘리프/);
  if (!m) return null;
  const n = (m[1] ?? m[2]).replace(/,/g, '');
  return `엘리프 ${n}개`;
}

function extractPreview(html: string): string {
  const lines: string[] = [];
  const tokenRegex = /(<hr[^>]*\/>)|(<p[^>]*class="se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>)/g;
  let match;
  while ((match = tokenRegex.exec(html)) !== null) {
    if (match[1]) break; // <hr> → 구분선에서 중단
    const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '')).replace(/\\u200B/g, '').trim();
    if (text.startsWith('※')) break;
    lines.push(text);
  }
  return lines.join('\n').trim();
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}
