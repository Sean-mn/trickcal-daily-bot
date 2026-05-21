import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { upsertGuildConfig } from '../services/db/GuildConfigService';

export const data = new SlashCommandBuilder()
  .setName('알림채널')
  .setDescription('트릭컬 업데이트 알림을 받을 채널을 설정합니다')
  .addChannelOption(option =>
    option
      .setName('채널')
      .setDescription('알림을 받을 채널을 선택하세요')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('채널', true);

  await upsertGuildConfig(interaction.guildId!, channel.id);
  await interaction.reply({ content: `✅ <#${channel.id}> 채널로 알림이 설정됐습니다.`, ephemeral: true });
}
