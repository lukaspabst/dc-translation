import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Collection,
  MessageContextMenuCommandInteraction,
  MessageFlags,
} from 'discord.js';
import * as settingsCommand from './settings';
import * as serverSettingsCommand from './serverSettings';
import * as setupCommand from './setup';
import * as setLanguageCommand from './setLanguage';
import * as setShowOriginalCommand from './setShowOriginal';
import * as setFlagDurationCommand from './setFlagDuration';
import * as translateTextCommand from './translateText';
import * as helpCommand from './help';
import * as liveThreadCommand from './liveThread';
import * as translateContextCommand from './translateContext';
import * as translatePermanentContextCommand from './translatePermanentContext';
import * as broadcastSetupCommand from './broadcastSetup';
import { dbService } from '../db/database';
import { mapDiscordLocaleToLanguage } from '../utils/flags';
import { getDynamicSetupLabels } from '../services/uiTranslator';

export type RegisteredCommand =
  | {
      kind: 'chat';
      data: { name: string };
      execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
      autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
    }
  | {
      kind: 'messageContext';
      data: { name: string };
      execute: (interaction: MessageContextMenuCommandInteraction) => Promise<void>;
    };

export const commands = new Collection<string, RegisteredCommand>();

const chatCommands: readonly {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}[] = [
  setupCommand,
  serverSettingsCommand,
  settingsCommand,
  setLanguageCommand,
  setShowOriginalCommand,
  setFlagDurationCommand,
  translateTextCommand,
  helpCommand,
  liveThreadCommand,
  broadcastSetupCommand,
];

for (const cmd of chatCommands) {
  commands.set(cmd.data.name, { kind: 'chat', ...cmd });
}

const contextCommands: readonly {
  data: { name: string };
  execute: (interaction: MessageContextMenuCommandInteraction) => Promise<void>;
}[] = [translateContextCommand, translatePermanentContextCommand];

for (const cmd of contextCommands) {
  commands.set(cmd.data.name, { kind: 'messageContext', ...cmd });
}

export async function handleCommandInteraction(
  interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction
): Promise<void> {
  const command = commands.get(interaction.commandName);
  if (!command) return;

  const requiresSetup = ['Translate', 'Translate (Permanent)', 'translate'].includes(
    interaction.commandName
  );
  if (requiresSetup) {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (!prefs.setup_completed) {
      const clientLangCode = mapDiscordLocaleToLanguage(interaction.locale);
      const labels = await getDynamicSetupLabels(interaction.locale);
      const { embed, components, files } = setupCommand.buildClientDetectedPrompt(
        interaction.user.username,
        clientLangCode,
        interaction.locale,
        labels
      );
      await interaction.reply({
        embeds: [embed],
        components,
        files,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  try {
    if (command.kind === 'chat' && interaction.isChatInputCommand()) {
      await command.execute(interaction);
    } else if (command.kind === 'messageContext' && interaction.isMessageContextMenuCommand()) {
      await command.execute(interaction);
    }
  } catch (error) {
    console.error('Command execution error:', error);
    const errPayload = {
      content: 'There was an error while executing this command!',
      flags: MessageFlags.Ephemeral,
    } as const;
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errPayload).catch(() => {});
    } else {
      await interaction.reply(errPayload).catch(() => {});
    }
  }
}

export async function handleAutocompleteInteraction(
  interaction: AutocompleteInteraction
): Promise<void> {
  const command = commands.get(interaction.commandName);
  if (command && command.kind === 'chat' && typeof command.autocomplete === 'function') {
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }
}
