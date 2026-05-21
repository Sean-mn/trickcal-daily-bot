export const FILTER_KEYWORDS = ['[업데이트]', '[업데이트PV]', '[개발자 노트]'];

export function matchesFilter(title: string): boolean {
  return FILTER_KEYWORDS.some(kw => title.includes(kw));
}

export function getPostType(title: string): string {
  if (title.includes('[업데이트PV]')) return '업데이트PV';
  if (title.includes('[업데이트]')) return '업데이트';
  if (title.includes('[개발자 노트]')) return '개발자 노트';
  return '공지';
}
