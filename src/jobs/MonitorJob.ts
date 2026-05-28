import axios from 'axios';
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
  let end = new Date(Date.UTC(year, em, ed, eh - 9, emin));
  if (end.getTime() < start.getTime()) {
    end = new Date(Date.UTC(year + 1, em, ed, eh - 9, emin));
  }
  const diff = start.getTime() - Date.now();
  if (diff < -180 * 24 * 3600 * 1000) {
    const adjStart = new Date(Date.UTC(year + 1, sm, sd, sh - 9, smin));
    let adjEnd = new Date(Date.UTC(year + 1, em, ed, eh - 9, emin));
    if (adjEnd.getTime() < adjStart.getTime()) {
      adjEnd = new Date(Date.UTC(year + 2, em, ed, eh - 9, emin));
    }
    return { start: adjStart, end: adjEnd };
  } else if (diff > 180 * 24 * 3600 * 1000) {
    const adjStart = new Date(Date.UTC(year - 1, sm, sd, sh - 9, smin));
    let adjEnd = new Date(Date.UTC(year - 1, em, ed, eh - 9, emin));
    if (adjEnd.getTime() < adjStart.getTime()) {
      adjEnd = new Date(Date.UTC(year, em, ed, eh - 9, emin));
    }
    return { start: adjStart, end: adjEnd };
  }
  return { start, end };
}

async function refreshMaintenanceEndIfActive(): Promise<Date | null> {
  const [window, lastMaintId] = await Promise.all([
    getMaintenanceWindow(),
    getLastMaintenanceId(),
  ]);
  if (!window || !lastMaintId || lastMaintId === '0') return null;
  const now = new Date();
  if (now < window.start || now >= window.end) return null;

  const details = await getMaintenanceDetails(lastMaintId);
  const parsed = parseMaintenanceTime(details.preview);
  if (parsed && parsed.end.getTime() !== window.end.getTime()) {
    await updateMaintenanceEnd(parsed.end);
    console.log(`[MonitorJob] 점검 연장 감지: 종료 시간 → ${parsed.end.toISOString()}`);
    return parsed.end;
  }
  return null;
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
  if (posts.length === 0) {
    console.warn('[MonitorJob] 포스트 조회 결과 없음 (API 응답 비어있음)');
    return;
  }

  const [lastId, lastMaintenanceId] = await Promise.all([
    getLastNoticeId(),
    getLastMaintenanceId(),
  ]);
  const latestId = posts[0].id;

  console.log(`[MonitorJob] 조회된 포스트 수: ${posts.length}, 최신 ID: ${latestId}, last-notice-id: ${lastId ?? 'null'}, last-maintenance-id: ${lastMaintenanceId ?? 'null'}`);

  // 점검 ID가 없으면 최신 점검 공지로 복구 (최초 실행 및 Redis 초기화 시)
  if (lastMaintenanceId === null) {
    console.log('[MonitorJob] last-maintenance-id 없음 → 현재 페이지에서 [점검] 포스트 복구 시도');
    const maintenancePost = posts.find(p => p.title.includes('[점검]'));
    if (maintenancePost) {
      console.log(`[MonitorJob] [점검] 포스트 발견: id=${maintenancePost.id}, title="${maintenancePost.title}"`);
      const details = await getMaintenanceDetails(maintenancePost.id);
      console.log(`[MonitorJob] 점검 본문 미리보기: ${details.preview.slice(0, 100).replace(/\n/g, ' ')}`);
      const parsed = parseMaintenanceTime(details.preview);
      if (parsed) {
        await setMaintenanceWindow(parsed.start, parsed.end);
        if (parsed.end <= new Date()) {
          await setMaintenanceEndNotified();
          console.log('[MonitorJob] 복구된 점검이 이미 종료됨 → end-notified 플래그 설정');
        }
        await updateMaintenanceActiveFlag();
        console.log(`[MonitorJob] 점검 일정 복구: ${parsed.start.toISOString()} ~ ${parsed.end.toISOString()}`);
        await setLastMaintenanceId(maintenancePost.id);
      } else {
        console.warn(`[MonitorJob] 점검 시간 파싱 실패 (본문에서 시간 패턴을 찾지 못함): "${details.preview.slice(0, 80)}"`);
      }
    } else {
      console.log('[MonitorJob] 현재 페이지에 [점검] 포스트 없음 → last-maintenance-id = "0" 설정');
      await setLastMaintenanceId('0');
    }
  }

  if (lastId === null) {
    console.log(`[MonitorJob] 최초 실행: 최신 포스트 알림 전송 후 기준 ID 등록`);
  }
  const effectiveLastId = lastId ?? String(Number(latestId) - 1);

  const newPosts = posts.filter(p => Number(p.id) > Number(effectiveLastId));
  const toNotify = newPosts.filter(p => matchesFilter(p.title));

  console.log(`[MonitorJob] 새 포스트: ${newPosts.length}개, 알림 대상: ${toNotify.length}개`);
  if (newPosts.length > 0) {
    console.log(`[MonitorJob] 새 포스트 목록: ${newPosts.map(p => `[${p.id}] ${p.title}`).join(' | ')}`);
  }
  if (newPosts.length > toNotify.length) {
    const skipped = newPosts.filter(p => !matchesFilter(p.title));
    console.log(`[MonitorJob] 필터 미통과 (알림 안 함): ${skipped.map(p => `"${p.title}"`).join(', ')}`);
  }

  // 새 [점검] 포스트를 먼저 처리해 점검 윈도우를 갱신한 뒤 종료 여부를 판단
  for (const post of toNotify) {
    if (post.title.includes('[점검]')) {
      const details = await getMaintenanceDetails(post.id);
      const parsed = parseMaintenanceTime(details.preview);
      if (parsed) {
        await setMaintenanceWindow(parsed.start, parsed.end);
        await setLastMaintenanceId(post.id);
        break; // toNotify는 최신순이므로 첫 매치만 반영
      }
    }
  }

  const extendedEnd = await refreshMaintenanceEndIfActive();
  const maintenanceEnded = await shouldNotifyMaintenanceEnd();
  if (maintenanceEnded) {
    console.log('[MonitorJob] 점검 종료 시간 경과 → 종료 알림 전송 예정');
  }

  if (toNotify.length > 0 || maintenanceEnded || extendedEnd !== null) {
    const configs = await getAllGuildConfigs();
    console.log(`[MonitorJob] 알림 대상 길드 수: ${configs.length}`);
    const channels = (
      await Promise.all(
        configs.map(async config => {
          try {
            const channel = client.channels.cache.get(config.channelId) ?? await client.channels.fetch(config.channelId);
            return channel instanceof TextChannel ? channel : null;
          } catch (e) {
            console.error(`[MonitorJob] 채널 페치 실패 (guildId=${config.guildId}, channelId=${config.channelId}):`, e);
            return null;
          }
        }),
      )
    ).filter((c): c is TextChannel => c !== null);
    console.log(`[MonitorJob] 전송 가능한 채널 수: ${channels.length}`);

    if (extendedEnd !== null) {
      const timeStr = extendedEnd.toLocaleString('ko-KR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul',
      });
      await Promise.allSettled(
        channels.map(async (ch) => {
          try { await ch.send(`⚠️ 점검이 연장되었습니다. 새로운 종료 예정 시간: ${timeStr}`); }
          catch (e) { console.error(`[MonitorJob] 점검 연장 알림 전송 실패 (channelId=${ch.id}):`, e); }
        }),
      );
      console.log('[MonitorJob] 점검 연장 알림 전송 완료');
    }

    if (maintenanceEnded) {
      await setMaintenanceActive(false);
      await Promise.allSettled(
        channels.map(async (ch) => {
          try { await ch.send('✅ 점검이 종료되었습니다.'); }
          catch (e) { console.error(`[MonitorJob] 점검 종료 알림 전송 실패 (channelId=${ch.id}):`, e); }
        }),
      );
      await setMaintenanceEndNotified();
      console.log('[MonitorJob] 점검 종료 알림 전송 완료');
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
        } else {
          console.warn(`[MonitorJob] [점검] 포스트이나 시간 파싱 실패: id=${post.id}, preview="${details.preview.slice(0, 80)}"`);
        }
      } else {
        content = await getPostContent(post.id);
      }

      const embed = buildEmbed(post, content, extraFields);
      const sendResults = await Promise.allSettled(
        channels.map((channel) => channel.send({ embeds: [embed] })),
      );
      sendResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[MonitorJob] 전송 실패 (channelId=${channels[i].id}, guildId=${channels[i].guildId}):`, r.reason);
        }
      });
      const successCount = sendResults.filter(r => r.status === 'fulfilled').length;
      if (successCount > 0) {
        await setLastNoticeId(post.id);
        console.log(`[MonitorJob] 알림 전송 완료 (${successCount}/${sendResults.length} 성공): [${post.id}] ${post.title}`);
      } else {
        console.warn(`[MonitorJob] 모든 채널 전송 실패로 last-notice-id 미갱신: [${post.id}] ${post.title}`);
      }
    }
  }

  if (newPosts.length > 0 && toNotify.length === 0) {
    await setLastNoticeId(latestId);
    console.log(`[MonitorJob] 알림 없이 last-notice-id 갱신: ${latestId}`);
  }

  await updateMaintenanceActiveFlag();
}

let isMonitorRunning = false;

export function startMonitorJob(client: Client<true>): void {
  cron.schedule('*/3 * * * *', async () => {
    if (isMonitorRunning) {
      console.warn('[MonitorJob] 이전 실행이 아직 진행 중이어서 이번 tick은 건너뜁니다.');
      return;
    }
    isMonitorRunning = true;
    try {
      await runMonitor(client);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? `${err.code ?? 'AXIOS'} - ${err.message} (url: ${err.config?.url})`
        : String(err);
      console.error(`[MonitorJob] 오류 발생: ${msg}`);
    } finally {
      isMonitorRunning = false;
    }
  });
  console.log('[MonitorJob] 모니터링 시작 (3분 주기)');
}
