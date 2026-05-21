import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { startMonitorJob } from './jobs/MonitorJob';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

startMonitorJob();
