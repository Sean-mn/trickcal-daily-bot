import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { getLatestPosts, getPostContent } from '../services/naver/NaverLoungeService';
import { getLastNoticeId, setLastNoticeId } from '../services/redis/RedisService';
import { buildEmbed } from '../services/discord/WebhookService';
import { matchesFilter } from '../config/filters';
import { getAllGuildConfigs } from '../services/db/GuildConfigService';

async function runMonitor(client: Client<true>): Promise<void> {
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

  if (toNotify.length > 0) {
    const configs = await getAllGuildConfigs();
    const channels = (
      await Promise.all(
        configs.map(async config => {
          try {
            const channel = await client.channels.fetch(config.channelId);
            return channel instanceof TextChannel ? channel : null;
          } catch (e) {
            console.error(`[MonitorJob] 채널 페치 실패 (${config.guildId}):`, e);
            return null;
          }
        }),
      )
    ).filter((c): c is TextChannel => c !== null);

    for (const post of toNotify.reverse()) {
      const content = await getPostContent(post.id);
      const embed = buildEmbed(post, content);
      for (const channel of channels) {
        try {
          await channel.send({ embeds: [embed] });
        } catch (e) {
          console.error(`[MonitorJob] 전송 실패 (${channel.guildId}):`, e);
        }
      }
      await setLastNoticeId(post.id);
      console.log(`[MonitorJob] 알림 전송: ${post.title}`);
    }
  }

  if (newPosts.length > 0 && toNotify.length === 0) {
    await setLastNoticeId(latestId);
  }
}

export function startMonitorJob(client: Client<true>): void {
  cron.schedule('*/3 * * * *', async () => {
    try {
      await runMonitor(client);
    } catch (err: any) {
      const msg = err?.isAxiosError
        ? `${err.code ?? 'AXIOS'} - ${err.message} (url: ${err.config?.url})`
        : String(err);
      console.error(`[MonitorJob] 오류 발생: ${msg}`);
    }
  });
  console.log('[MonitorJob] 모니터링 시작 (3분 주기)');
}
