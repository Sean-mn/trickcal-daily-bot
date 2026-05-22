import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getMaintenanceWindow } from '../services/redis/RedisService';

export const data = new SlashCommandBuilder()
  .setName('점검')
  .setDescription('현재 트릭컬 점검 상태를 확인합니다');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const window = await getMaintenanceWindow();
  const now = new Date();
  const nowTs = Math.floor(now.getTime() / 1000);

  if (!window) {
    const embed = new EmbedBuilder()
      .setTitle('점검 현황')
      .setDescription('현재 진행 중인 점검이 없습니다.')
      .setColor(0x57f287)
      .addFields({ name: '조회 시각', value: `<t:${nowTs}:F>`, inline: true })
      .setFooter({ text: '트릭컬 리바이브 · 네이버 게임 라운지' });
    await interaction.reply({ embeds: [embed] });
    return;
  }

  const { start, end } = window;
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
