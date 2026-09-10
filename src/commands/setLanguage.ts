import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  CacheType,
  MessageFlags,
} from 'discord.js';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';
import { normalizeLanguageCode, searchLanguages, getLocalizedLanguageName } from '../utils/flags';
import { syncUserLiveThreadLanguage } from './liveThread';

export const data = new SlashCommandBuilder()
  .setName('setlanguage')
  .setDescription('Sets your default target language for translations')
  .setDescriptionLocalizations({
    de: 'Legt deine Standard-Zielsprache für Übersetzungen fest',
    'es-ES': 'Establece tu idioma destino predeterminado',
    fr: 'Définit votre langue cible par défaut pour les traductions',
    it: 'Imposta la tua lingua di destinazione predefinita',
  })
  .addStringOption((option) =>
    option
      .setName('language')
      .setDescription('Search by language name or country (e.g., German, Spanish, de, ja)')
      .setDescriptionLocalizations({
        de: 'Sprachname oder Ländercode (z. B. Deutsch, Spanisch, de, ja)',
        'es-ES': 'Buscar por nombre de idioma o país (ej. español, de, ja)',
        fr: 'Rechercher par nom de langue ou pays (ex. français, de, ja)',
        it: 'Cerca per lingua o paese (es. italiano, de, ja)',
      })
      .setRequired(true)
      .setAutocomplete(true)
      .setMaxLength(30)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  const choices = searchLanguages(focusedValue, interaction.locale);
  await interaction.respond(
    choices.map((choice) => ({
      name: `${choice.name} (${choice.code})`,
      value: choice.code,
    }))
  );
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const language = interaction.options.getString('language');

  if (!language) {
    await interaction.reply({ content: 'Language is required.', flags: MessageFlags.Ephemeral });
    return;
  }

  const cleanLang = normalizeLanguageCode(language);
  try {
    dbService.setUserLanguage(interaction.user.id, cleanLang);
    if (interaction.guild) {
      await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, cleanLang);
    }
    const langName = getLocalizedLanguageName(cleanLang, interaction.locale);
    await interaction.reply({
      content: `Your default target language has been set to **${langName}** (\`${cleanLang}\`).`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error saving language:', error);
    await interaction.reply({
      content: 'Failed to save your language preference. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
