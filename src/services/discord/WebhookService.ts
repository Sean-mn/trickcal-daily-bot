import { EmbedBuilder } from 'discord.js';
import { getPostType } from '../../config/filters';
import { NaverPost } from '../naver/NaverLoungeService';

function formatDate(raw: string): string {
  if (raw.length < 12) return raw;
  return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
}

const COLOR_MAP: Record<string, number> = {
  '업데이트': 0x5865f2,
  '업데이트PV': 0xeb459e,
  '개발자 노트': 0x57f287,
  '점검': 0xed4245,
  '테마극장': 0xe67e22,
  '이벤트': 0x1abc9c,
  '안내': 0x95a5a6,
  '공지': 0xfee75c,
};

export function buildEmbed(post: NaverPost, content?: string): EmbedBuilder {
  const postType = getPostType(post.title);

  const embed = new EmbedBuilder()
    .setTitle(post.title)
    .setURL(post.url)
    .setDescription(content ? content.slice(0, 4096) : null)
    .setColor(COLOR_MAP[postType] ?? COLOR_MAP['공지'])
    .addFields(
      { name: '유형', value: postType, inline: true },
      { name: '작성일', value: formatDate(post.createdDate), inline: true },
    )
    .setFooter({ text: '트릭컬 리바이브 · 네이버 게임 라운지' });

  if (post.imageUrl) embed.setImage(post.imageUrl);

  return embed;
}
