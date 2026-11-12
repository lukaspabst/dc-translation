import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import * as settingsCommand from './commands/settings';
import * as serverSettingsCommand from './commands/serverSettings';
import * as setupCommand from './commands/setup';
import * as setLanguageCommand from './commands/setLanguage';
import * as setShowOriginalCommand from './commands/setShowOriginal';
import * as setFlagDurationCommand from './commands/setFlagDuration';
import * as translateTextCommand from './commands/translateText';
import * as helpCommand from './commands/help';
import * as liveThreadCommand from './commands/liveThread';
import * as translateContextCommand from './commands/translateContext';
import * as translatePermanentContextCommand from './commands/translatePermanentContext';
import * as broadcastSetupCommand from './commands/broadcastSetup';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN or DISCORD_CLIENT_ID is missing in .env file.');
  process.exit(1);
}

const commands = [
  setupCommand.data.toJSON(),
  settingsCommand.data.toJSON(),
  serverSettingsCommand.data.toJSON(),
  setLanguageCommand.data.toJSON(),
  setShowOriginalCommand.data.toJSON(),
  setFlagDurationCommand.data.toJSON(),
  translateTextCommand.data.toJSON(),
  helpCommand.data.toJSON(),
  liveThreadCommand.data.toJSON(),
  translateContextCommand.data.toJSON(),
  translatePermanentContextCommand.data.toJSON(),
  broadcastSetupCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} application commands...`);

    const result = (await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    })) as unknown[];

    console.log(`Successfully reloaded ${result.length} application commands.`);
  } catch (error) {
    console.error('Failed to reload commands:', error);
  }
})();
