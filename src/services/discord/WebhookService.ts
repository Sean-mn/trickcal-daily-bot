import axios from 'axios';
import { getPostType } from '../../config/filters';
import { NaverPost } from '../naver/NaverLoungeService';

const COLOR_MAP: Record<string, number> = {
  '업데이트': 0x5865f2,
  '업데이트PV': 0xeb459e,
  '개발자 노트': 0x57f287,
  '공지': 0xfee75c,
};

export async function sendNotification(post: NaverPost, content?: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');

  const postType = getPostType(post.title);

  await axios.post(webhookUrl, {
    username: '트릭컬 업데이트 알리미',
    embeds: [
      {
        title: post.title,
        url: post.url,
        description: content ? `${content}…` : undefined,
        color: COLOR_MAP[postType] ?? COLOR_MAP['공지'],
        fields: [
          { name: '유형', value: postType, inline: true },
          { name: '작성일', value: post.writtenAt, inline: true },
        ],
        footer: { text: '트릭컬 리바이브 · 네이버 게임 라운지' },
      },
    ],
  });
}
