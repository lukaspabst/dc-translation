import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  CacheType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';
import {
  normalizeLanguageCode,
  searchLanguages,
  getLocalizedLanguageName,
} from '../utils/flags';
import { getDynamicUILabels } from '../services/uiTranslator';

export const data = new SlashCommandBuilder()
  .setName('translate')
  .setDescription('Translate any text directly')
  .setDescriptionLocalizations({
    de: 'Übersetze einen beliebigen Text direkt',
    'es-ES': 'Traduce cualquier texto directamente',
    fr: 'Traduire n importe quel texte directement',
    it: 'Traduci qualsiasi testo direttamente',
  })
  .addStringOption((option) =>
    option
      .setName('text')
      .setDescription('The text you want to translate')
      .setDescriptionLocalizations({
        de: 'Der Text, den du übersetzen möchtest',
        'es-ES': 'El texto que deseas traducir',
        fr: 'Le texte que vous souhaitez traduire',
        it: 'Il testo che desideri tradurre',
      })
      .setRequired(true)
      .setMaxLength(2000)
  )
  .addStringOption((option) =>
    option
      .setName('to')
      .setDescription('Target language (optional, defaults to your set language)')
      .setDescriptionLocalizations({
        de: 'Zielsprache (optional, Standard ist deine eingestellte Sprache)',
        'es-ES': 'Idioma destino (opcional)',
        fr: 'Langue cible (optionnel)',
        it: 'Lingua di destinazione (opzionale)',
      })
      .setRequired(false)
      .setAutocomplete(true)
  )
  .addBooleanOption((option) =>
    option
      .setName('share')
      .setDescription('Share publicly in channel? (Default: False / Private to you)')
      .setDescriptionLocalizations({
        de: 'Im Kanal teilen? (Standard: Nein / Nur für dich sichtbar)',
        'es-ES': '¿Compartir en el canal? (Por defecto: No)',
        fr: 'Partager dans le salon ? (Par défaut : Non)',
        it: 'Condividere nel canale? (Predefinito: No)',
      })
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('engine')
      .setDescription('Translation engine')
      .setDescriptionLocalizations({
        de: 'Übersetzungs-Engine',
        'es-ES': 'Motor de traducción',
        fr: 'Moteur de traduction',
        it: 'Motore di traduzione',
      })
      .setRequired(false)
      .addChoices(
        { name: 'Google Cloud (Default / Fast)', value: 'google' },
        { name: 'DeepL (High Precision)', value: 'deepl' }
      )
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  const choices = searchLanguages(focusedValue, interaction.locale);
  await interaction.respond(
    choices.map((choice) => ({
      name: `${choice.flag} ${choice.name} (${choice.code})`,
      value: choice.code,
    }))
  );
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const text = interaction.options.getString('text', true);
  const share = interaction.options.getBoolean('share') ?? false;
  const requestedLang = interaction.options.getString('to');
  const requestedEngine = interaction.options.getString('engine');

  const userPrefs = dbService.getUserPreferences(interaction.user.id);
  const targetLanguage = requestedLang ? normalizeLanguageCode(requestedLang) : userPrefs.target_language;
  const engine = requestedEngine || userPrefs.preferred_engine || 'google';

  const isEphemeral = !share;
  await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

  try {
    let translatedText: string;
    let actualEngine: 'google' | 'deepl' = 'google';

    if (engine === 'deepl') {
      try {
        translatedText = await translationService.translateWithDeepL(text, targetLanguage);
        actualEngine = 'deepl';
      } catch (e) {
        console.warn('DeepL failed in /translate, falling back to Google:', e);
        translatedText = await translationService.translateWithGoogle(text, targetLanguage);
      }
    } else {
      translatedText = await translationService.translateWithGoogle(text, targetLanguage);
    }

    const ui = await getDynamicUILabels(targetLanguage);
    const targetLangName = getLocalizedLanguageName(targetLanguage, interaction.locale);

    const embed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(`${ui.title} (${targetLangName})`)
      .addFields({ name: ui.translated, value: translatedText.substring(0, 1024) });

    if (userPrefs.show_original) {
      embed.addFields({ name: ui.original, value: `>>> ${text.substring(0, 1024)}` });
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>();

    if (actualEngine !== 'deepl') {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`translate_text_deepl:${targetLanguage}`)
          .setLabel(ui.deeplBtn)
          .setStyle(ButtonStyle.Primary)
      );
    }

    if (interaction.guildId && interaction.channelId) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`livethread_open:${interaction.channelId}:0:${targetLanguage}`)
          .setLabel(ui.liveThreadBtn)
          .setStyle(ButtonStyle.Secondary)
      );
    }

    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId('translate_dismiss')
        .setLabel(ui.dismiss)
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  } catch (error) {
    console.error('Translation error in /translate:', error);
    await interaction.editReply({ content: 'An error occurred while translating your text.' });
  }
}
