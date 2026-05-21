import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { startMonitorJob } from './jobs/MonitorJob';
import { execute as executeSetChannel } from './commands/setChannel';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  startMonitorJob(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === '알림채널') {
    await executeSetChannel(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
