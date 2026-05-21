import 'dotenv/config';
import { REST, Routes } from 'discord.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('슬래시 커맨드 등록 중...');
    // commands 배열은 각 커맨드 구현 후 여기에 추가
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
      { body: [] },
    );
    console.log('슬래시 커맨드 등록 완료');
  } catch (error) {
    console.error(error);
  }
})();
