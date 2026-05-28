import { redis } from '../redis/RedisService';

const GUILD_CONFIGS_KEY = 'trickcal:guild-configs';

export async function upsertGuildConfig(guildId: string, channelId: string): Promise<void> {
  await redis.hset(GUILD_CONFIGS_KEY, guildId, channelId);
}

export async function getAllGuildConfigs(): Promise<{ guildId: string; channelId: string }[]> {
  const entries = await redis.hgetall(GUILD_CONFIGS_KEY);
  return Object.entries(entries).map(([guildId, channelId]) => ({ guildId, channelId }));
}
