import axios from 'axios';

const HEADERS = {
  'Origin': 'https://game.naver.com',
  'Referer': 'https://game.naver.com/lounge/Trickcal/board/11',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'front-client-platform-type': 'PC',
  'front-client-product-type': 'web',
};

export interface NaverPost {
  id: string;
  title: string;
  createdDate: string;
  updatedDate: string;
  url: string;
}

export async function getLatestPosts(): Promise<NaverPost[]> {
  const apiUrl = process.env.NAVER_BOARD_API_URL;
  if (!apiUrl) throw new Error('NAVER_BOARD_API_URL 환경변수가 설정되지 않았습니다.');

  const res = await axios.get(apiUrl, { headers: HEADERS });

  const feeds = res.data?.content?.feeds;

  if (!Array.isArray(feeds)) {
    console.log('[NaverAPI] 예상과 다른 응답:', res.data);
    return [];
  }

  return feeds.map((item: any) => {
    const feed = item.feed;
    return {
      id: String(feed.feedId),
      title: feed.title,
      createdDate: feed.createdDate,
      updatedDate: feed.updatedDate,
      url: `https://game.naver.com/lounge/Trickcal/board/detail/${feed.feedId}`,
    };
  });
}

// NOTE: 실제 API 응답 구조에 따라 content 필드명을 수정해야 합니다.
export async function getPostContent(id: string): Promise<string> {
  const baseUrl = process.env.NAVER_ARTICLE_API_BASE_URL;
  if (!baseUrl) return '';

  const res = await axios.get(`${baseUrl}/${id}`, { headers: HEADERS });

  const raw: string =
    res.data?.result?.content ??
    res.data?.result?.body ??
    res.data?.content ??
    res.data?.body ??
    '';

  return stripHtml(raw).slice(0, 200);
}

function stripHtml(html: unknown): string {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
