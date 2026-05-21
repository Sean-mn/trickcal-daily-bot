import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as setChannelCommand } from './commands/setChannel';
import { data as 점검Command } from './commands/maintenance';

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('슬래시 커맨드 등록 중...');
    await rest.put(
      process.env.GUILD_ID
        ? Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID)
        : Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: [setChannelCommand.toJSON(), 점검Command.toJSON()] },
    );
    console.log('슬래시 커맨드 등록 완료');
  } catch (error) {
    console.error(error);
  }
})();
