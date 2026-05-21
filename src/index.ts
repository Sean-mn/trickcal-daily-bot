import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { startMonitorJob } from './jobs/MonitorJob';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

startMonitorJob();
