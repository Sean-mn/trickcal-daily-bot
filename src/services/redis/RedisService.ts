import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const LAST_ID_KEY = 'trickcal:last-notice-id';
const LAST_MAINTENANCE_ID_KEY = 'trickcal:last-maintenance-id';
const MAINTENANCE_START_KEY = 'trickcal:maintenance-start';
const MAINTENANCE_END_KEY = 'trickcal:maintenance-end';
const MAINTENANCE_ACTIVE_KEY = 'trickcal:maintenance-active';
const MAINTENANCE_END_NOTIFIED_KEY = 'trickcal:maintenance-end-notified';

export async function getLastNoticeId(): Promise<string | null> {
  return redis.get(LAST_ID_KEY);
}

export async function setLastNoticeId(id: string): Promise<void> {
  await redis.set(LAST_ID_KEY, id);
}

export async function getLastMaintenanceId(): Promise<string | null> {
  return redis.get(LAST_MAINTENANCE_ID_KEY);
}

export async function setLastMaintenanceId(id: string): Promise<void> {
  await redis.set(LAST_MAINTENANCE_ID_KEY, id);
}

export async function getMaintenanceWindow(): Promise<{ start: Date; end: Date } | null> {
  const [startStr, endStr] = await Promise.all([
    redis.get(MAINTENANCE_START_KEY),
    redis.get(MAINTENANCE_END_KEY),
  ]);
  if (!startStr || !endStr) return null;
  return { start: new Date(startStr), end: new Date(endStr) };
}

export async function setMaintenanceWindow(start: Date, end: Date): Promise<void> {
  await Promise.all([
    redis.set(MAINTENANCE_START_KEY, start.toISOString()),
    redis.set(MAINTENANCE_END_KEY, end.toISOString()),
    redis.del(MAINTENANCE_END_NOTIFIED_KEY),
  ]);
}

export async function updateMaintenanceEnd(end: Date): Promise<void> {
  await Promise.all([
    redis.set(MAINTENANCE_END_KEY, end.toISOString()),
    redis.del(MAINTENANCE_END_NOTIFIED_KEY),
  ]);
}

export async function isMaintenanceActive(): Promise<boolean> {
  return (await redis.get(MAINTENANCE_ACTIVE_KEY)) === '1';
}

export async function setMaintenanceActive(active: boolean): Promise<void> {
  if (active) await redis.set(MAINTENANCE_ACTIVE_KEY, '1');
  else await redis.del(MAINTENANCE_ACTIVE_KEY);
}

export async function isMaintenanceEndNotified(): Promise<boolean> {
  return (await redis.get(MAINTENANCE_END_NOTIFIED_KEY)) === '1';
}

export async function setMaintenanceEndNotified(): Promise<void> {
  await redis.set(MAINTENANCE_END_NOTIFIED_KEY, '1');
}
