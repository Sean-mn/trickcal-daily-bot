import cron from 'node-cron';
import { getLatestPosts, getPostContent } from '../services/naver/NaverLoungeService';
import { getLastNoticeId, setLastNoticeId } from '../services/redis/RedisService';
import { sendNotification } from '../services/discord/WebhookService';
import { matchesFilter } from '../config/filters';

async function runMonitor(): Promise<void> {
  const posts = await getLatestPosts();
  if (posts.length === 0) return;

  const lastId = await getLastNoticeId();
  const latestId = posts[0].id;

  if (lastId === null) {
    await setLastNoticeId(latestId);
    console.log(`[MonitorJob] 초기화 완료. 기준 ID: ${latestId}`);
    return;
  }

  const newPosts = posts.filter(p => Number(p.id) > Number(lastId));
  const toNotify = newPosts.filter(p => matchesFilter(p.title));

  for (const post of toNotify.reverse()) {
    const content = await getPostContent(post.id);
    await sendNotification(post, content);
    await setLastNoticeId(post.id);
    console.log(`[MonitorJob] 알림 전송: ${post.title}`);
  }

  if (newPosts.length > 0 && toNotify.length === 0) {
    await setLastNoticeId(latestId);
  }
}

export function startMonitorJob(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runMonitor();
    } catch (err) {
      console.error('[MonitorJob] 오류 발생:', err);
    }
  });
  console.log('[MonitorJob] 모니터링 시작 (5분 주기)');
}
