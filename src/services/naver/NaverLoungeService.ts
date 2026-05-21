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
  writtenAt: string;
  url: string;
}

export async function getLatestPosts(): Promise<NaverPost[]> {
  const apiUrl = process.env.NAVER_BOARD_API_URL;
  if (!apiUrl) throw new Error('NAVER_BOARD_API_URL 환경변수가 설정되지 않았습니다.');

  const res = await axios.get(apiUrl, { headers: HEADERS });

  // NOTE: 실제 API 응답 구조에 따라 아래 파싱 로직을 수정해야 합니다.
  // DevTools Network 탭에서 응답 JSON을 확인 후 알맞은 필드명으로 교체하세요.
  const items: any[] =
    res.data?.result?.articleList ??
    res.data?.content ??
    res.data?.articles ??
    [];

  return items.map((item: any) => ({
    id: String(item.articleId ?? item.id),
    title: item.subject ?? item.title ?? '',
    writtenAt: item.regDate ?? item.writtenAt ?? '',
    url: `https://game.naver.com/lounge/Trickcal/board/11/${item.articleId ?? item.id}`,
  }));
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
