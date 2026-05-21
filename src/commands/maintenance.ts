import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getMaintenanceWindow } from '../services/redis/RedisService';

export const data = new SlashCommandBuilder()
  .setName('점검')
  .setDescription('현재 트릭컬 점검 상태를 확인합니다');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const window = await getMaintenanceWindow();

  if (!window) {
    await interaction.reply('현재 진행 중인 점검이 없습니다.');
    return;
  }

  const { start, end } = window;
  const now = new Date();
  const s = Math.floor(start.getTime() / 1000);
  const e = Math.floor(end.getTime() / 1000);

  if (now < start) {
    await interaction.reply(`📅 점검 예정\n⏰ <t:${s}:t> ~ <t:${e}:t>\n🕐 시작까지 <t:${s}:R>`);
  } else if (now < end) {
    await interaction.reply(`🔧 점검 중\n⏰ <t:${s}:t> ~ <t:${e}:t>\n🕐 종료까지 <t:${e}:R>`);
  } else {
    await interaction.reply('✅ 점검이 종료되었습니다.');
  }
}
