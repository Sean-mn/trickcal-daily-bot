export const FILTER_KEYWORDS = ['[업데이트]', '[업데이트PV]', '[개발자 노트]', '[점검]', '[테마극장]', '[이벤트]', '[안내]'];

export function matchesFilter(title: string): boolean {
  return FILTER_KEYWORDS.some(kw => title.includes(kw));
}

export function getPostType(title: string): string {
  if (title.includes('[업데이트PV]')) return '업데이트PV';
  if (title.includes('[업데이트]')) return '업데이트';
  if (title.includes('[개발자 노트]')) return '개발자 노트';
  if (title.includes('[점검]')) return '점검';
  if (title.includes('[테마극장]')) return '테마극장';
  if (title.includes('[이벤트]')) return '이벤트';
  if (title.includes('[안내]')) return '안내';
  return '공지';
}
