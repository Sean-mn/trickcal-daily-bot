import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const LAST_ID_KEY = 'trickcal:last-notice-id';

export async function getLastNoticeId(): Promise<string | null> {
  return redis.get(LAST_ID_KEY);
}

export async function setLastNoticeId(id: string): Promise<void> {
  await redis.set(LAST_ID_KEY, id);
}
