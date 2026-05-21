import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { upsertGuildConfig } from '../services/db/GuildConfigService';

export const data = new SlashCommandBuilder()
  .setName('알림채널')
  .setDescription('트릭컬 업데이트 알림을 받을 채널을 설정합니다')
  .addStringOption(option =>
    option
      .setName('채널이름')
      .setDescription('알림을 받을 채널 이름 (예: 공지)')
      .setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('채널이름', true);
  const channel = interaction.guild?.channels.cache.find(
    ch => ch.type === ChannelType.GuildText && ch.name === name,
  );

  if (!channel) {
    await interaction.reply({ content: `❌ "${name}" 이름의 텍스트 채널을 찾을 수 없습니다.`, ephemeral: true });
    return;
  }

  await upsertGuildConfig(interaction.guildId!, channel.id);
  await interaction.reply({ content: `✅ <#${channel.id}> 채널로 알림이 설정됐습니다.`, ephemeral: true });
}
