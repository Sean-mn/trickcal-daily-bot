import prisma from '../../lib/prisma';

export async function upsertGuildConfig(guildId: string, channelId: string): Promise<void> {
  await prisma.guildConfig.upsert({
    where: { guildId },
    update: { channelId },
    create: { guildId, channelId },
  });
}

export async function getAllGuildConfigs(): Promise<{ guildId: string; channelId: string }[]> {
  return prisma.guildConfig.findMany();
}
