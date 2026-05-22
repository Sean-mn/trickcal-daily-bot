import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { getLatestPosts, getPostContent, getMaintenanceDetails } from '../services/naver/NaverLoungeService';
import {
  getLastNoticeId,
  setLastNoticeId,
  getLastMaintenanceId,
  setLastMaintenanceId,
  getMaintenanceWindow,
  setMaintenanceWindow,
  updateMaintenanceEnd,
  setMaintenanceActive,
  isMaintenanceEndNotified,
  setMaintenanceEndNotified,
} from '../services/redis/RedisService';
import { buildEmbed } from '../services/discord/WebhookService';
import { matchesFilter } from '../config/filters';
import { getAllGuildConfigs } from '../services/db/GuildConfigService';

function parseMaintenanceTime(text: string): { start: Date; end: Date } | null {
  const m = text.match(
    /(\d+)월\s*(\d+)일[^0-9]{0,20}(\d+):(\d+)\s*~\s*(?:(\d+)월\s*(\d+)일[^0-9]{0,20})?(\d+):(\d+)/,
  );
  if (!m) return null;
  const kstNow = new Date(Date.now() + 9 * 3600000);
  const year = kstNow.getUTCFullYear();
  const sm = parseInt(m[1]) - 1, sd = parseInt(m[2]), sh = parseInt(m[3]), smin = parseInt(m[4]);
  const em = m[5] ? parseInt(m[5]) - 1 : sm;
  const ed = m[6] ? parseInt(m[6]) : sd;
  const eh = parseInt(m[7]), emin = parseInt(m[8]);
  const start = new Date(Date.UTC(year, sm, sd, sh - 9, smin));
  const end = new Date(Date.UTC(year, em, ed, eh - 9, emin));
  if (start.getTime() < Date.now() - 60 * 24 * 3_600_000) {
    return {
      start: new Date(Date.UTC(year + 1, sm, sd, sh - 9, smin)),
      end: new Date(Date.UTC(year + 1, em, ed, eh - 9, emin)),
    };
  }
  return { start, end };
}

async function refreshMaintenanceEndIfActive(): Promise<void> {
  const [window, lastMaintId] = await Promise.all([
    getMaintenanceWindow(),
    getLastMaintenanceId(),
  ]);
  if (!window || !lastMaintId || lastMaintId === '0') return;
  const now = new Date();
  if (now < window.start || now >= window.end) return;

  const details = await getMaintenanceDetails(lastMaintId);
  const parsed = parseMaintenanceTime(details.preview);
  if (parsed && parsed.end.getTime() !== window.end.getTime()) {
    await updateMaintenanceEnd(parsed.end);
    console.log(`[MonitorJob] 점검 연장 감지: 종료 시간 → ${parsed.end.toISOString()}`);
  }
}

async function shouldNotifyMaintenanceEnd(): Promise<boolean> {
  const window = await getMaintenanceWindow();
  if (!window || new Date() < window.end) return false;
  return !(await isMaintenanceEndNotified());
}

async function updateMaintenanceActiveFlag(): Promise<void> {
  const window = await getMaintenanceWindow();
  if (!window) { await setMaintenanceActive(false); return; }
  const now = new Date();
  await setMaintenanceActive(now >= window.start && now < window.end);
}

async function runMonitor(client: Client<true>): Promise<void> {
  const posts = await getLatestPosts();
  if (posts.length === 0) return;

  const [lastId, lastMaintenanceId] = await Promise.all([
    getLastNoticeId(),
    getLastMaintenanceId(),
  ]);
  const latestId = posts[0].id;

  // 점검 ID가 없으면 최신 점검 공지로 복구 (최초 실행 및 Redis 초기화 시)
  if (lastMaintenanceId === null) {
    const maintenancePost = posts.find(p => p.title.includes('[점검]'));
    if (maintenancePost) {
      const details = await getMaintenanceDetails(maintenancePost.id);
      const parsed = parseMaintenanceTime(details.preview);
      if (parsed) {
        await setMaintenanceWindow(parsed.start, parsed.end);
        if (parsed.end <= new Date()) {
          await setMaintenanceEndNotified();
        }
        await updateMaintenanceActiveFlag();
        console.log(`[MonitorJob] 점검 일정 복구: ${parsed.start.toISOString()} ~ ${parsed.end.toISOString()}`);
      }
      await setLastMaintenanceId(maintenancePost.id);
    } else {
      await setLastMaintenanceId('0');
    }
  }

  if (lastId === null) {
    await setLastNoticeId(latestId);
    console.log(`[MonitorJob] 초기화 완료. 기준 ID: ${latestId}`);
    return;
  }

  const newPosts = posts.filter(p => Number(p.id) > Number(lastId));
  const toNotify = newPosts.filter(p => matchesFilter(p.title));
  await refreshMaintenanceEndIfActive();
  const maintenanceEnded = await shouldNotifyMaintenanceEnd();

  if (toNotify.length > 0 || maintenanceEnded) {
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

    if (maintenanceEnded) {
      await setMaintenanceActive(false);
      for (const ch of channels) {
        try { await ch.send('✅ 점검이 종료되었습니다.'); }
        catch (e) { console.error(`[MonitorJob] 점검 종료 알림 전송 실패:`, e); }
      }
      await setMaintenanceEndNotified();
      console.log('[MonitorJob] 점검 종료 알림 전송');
    }

    for (const post of toNotify.reverse()) {
      const is점검 = post.title.includes('[점검]');
      let content: string;
      let extraFields: { name: string; value: string }[] | undefined;

      if (is점검) {
        const details = await getMaintenanceDetails(post.id);
        content = details.preview;
        if (details.compensation) {
          extraFields = [{ name: '📌 점검 보상', value: details.compensation }];
        }
        const window = parseMaintenanceTime(details.preview);
        if (window) {
          await setMaintenanceWindow(window.start, window.end);
          await setLastMaintenanceId(post.id);
          console.log(`[MonitorJob] 점검 일정 저장: ${window.start.toISOString()} ~ ${window.end.toISOString()}`);
        }
      } else {
        content = await getPostContent(post.id);
      }

      const embed = buildEmbed(post, content, extraFields);
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

  await updateMaintenanceActiveFlag();
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
