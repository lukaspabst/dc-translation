import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  Partials,
  ThreadChannel,
} from 'discord.js';
import * as dotenv from 'dotenv';
import * as http from 'http';
import { initDeepL, initGoogleApi } from './services/translator';
import { flushAllBatches } from './services/messageBatcher';
import { dbService, initDatabase } from './db/database';
import {
  handleAutocompleteInteraction,
  handleCommandInteraction,
} from './commands/registry';
import {
  handleModalSubmitInteraction,
  handleSelectMenuInteraction,
} from './events/selectAndModalHandlers';
import { handleButtonInteraction } from './events/liveThreadAndTranslateButtons';
import { registerMessageAndReactionHandlers } from './events/messageAndReactionHandlers';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  initDeepL(process.env.DEEPL_AUTH_KEY);
  initGoogleApi(process.env.GOOGLE_TRANSLATE_API_KEY);
  await initDatabase();

  try {
    const liveThreads = dbService.getAllLiveThreads();
    for (const lt of liveThreads) {
      const thread = (await client.channels.fetch(lt.thread_id).catch(() => null)) as ThreadChannel | null;
      if (thread && thread.isThread() && thread.locked) {
        await thread.setLocked(false).catch(() => {});
      }
    }
  } catch {}
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
    await handleCommandInteraction(interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocompleteInteraction(interaction);
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenuInteraction(interaction);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleModalSubmitInteraction(interaction);
  }
});

registerMessageAndReactionHandlers(client);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Method Not Allowed' }));
    return;
  }

  if (req.url === '/' || req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'dc-translation',
        ready: client.isReady(),
        uptime: Math.floor(process.uptime()),
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'error', message: 'Not Found' }));
});
server.listen(port, () => {
  console.log(`Healthcheck server listening on port ${port}`);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is missing in .env file.');
  process.exit(1);
}

process.on('SIGTERM', async () => {
  await flushAllBatches(client);
  process.exit(0);
});

process.on('SIGINT', async () => {
  await flushAllBatches(client);
  process.exit(0);
});

client.login(token);
