import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  CacheType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';
import {
  POPULAR_LANGUAGES,
  mapDiscordLocaleToLanguage,
  getLocalizedLanguageName,
} from '../utils/flags';
import { createModernTranslationEmbed } from '../utils/embeds';
import { getDynamicUILabels } from '../services/uiTranslator';
import { UILabels } from '../utils/locales';

export const data = new ContextMenuCommandBuilder()
  .setName('Translate')
  .setNameLocalizations({
    de: 'Übersetzen',
    'es-ES': 'Traducir',
    fr: 'Traduire',
    it: 'Traduci',
  })
  .setType(ApplicationCommandType.Message);

export function buildTranslationComponents(
  channelId: string,
  messageId: string,
  targetLanguage: string,
  isEphemeral = true,
  customUI?: UILabels,
  locale?: string
): [ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>] {
  const ui = customUI || translationService.getUI(targetLanguage);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`translate_switch:${channelId}:${messageId}`)
    .setPlaceholder(ui.switchLangPlaceholder)
    .addOptions(
      POPULAR_LANGUAGES.slice(0, 25).map((lang) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${getLocalizedLanguageName(lang.code, locale)} (${lang.code})`)
          .setValue(lang.code)
          .setEmoji(lang.flag)
          .setDefault(lang.code === targetLanguage)
      )
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>();

  buttonsRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`deepl_translate:${channelId}:${messageId}:${targetLanguage}`)
      .setLabel(ui.deeplBtn)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`livethread_open:${channelId}:${messageId}:${targetLanguage}`)
      .setLabel(ui.liveThreadBtn || 'Live Thread')
      .setStyle(ButtonStyle.Secondary)
  );

  if (isEphemeral) {
    buttonsRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`translate_share:${channelId}:${messageId}:${targetLanguage}`)
        .setLabel(ui.share)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  buttonsRow.addComponents(
    new ButtonBuilder()
      .setCustomId('translate_dismiss')
      .setLabel(ui.dismiss)
      .setStyle(ButtonStyle.Danger)
  );

  return [selectRow, buttonsRow];
}

export async function execute(interaction: MessageContextMenuCommandInteraction<CacheType>) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const message = interaction.targetMessage;

    if (!message.content || message.content.trim() === '') {
      await interaction.editReply({ content: 'This message has no text to translate.' });
      return;
    }

    const userPrefs = dbService.getUserPreferences(interaction.user.id);
    let targetLanguage = userPrefs.target_language;
    if (!userPrefs.setup_completed && targetLanguage === 'en' && interaction.locale) {
      targetLanguage = mapDiscordLocaleToLanguage(interaction.locale);
    }

    const translatedText = await translationService.translateWithGoogle(message.content, targetLanguage);
    const ui = await getDynamicUILabels(targetLanguage);

    const embed = createModernTranslationEmbed({
      author: message.author,
      translatedText,
      targetLanguage,
      originalText: message.content,
      showOriginal: userPrefs.show_original === 1,
      engine: 'google',
      locale: interaction.locale,
    });

    const [selectRow, buttonsRow] = buildTranslationComponents(
      message.channelId,
      message.id,
      targetLanguage,
      true,
      ui,
      interaction.locale
    );

    await interaction.editReply({
      embeds: [embed],
      components: [selectRow, buttonsRow],
    });
  } catch (error) {
    console.error('Translation error:', error);
    await interaction.editReply({ content: 'An error occurred while translating the message.' });
  }
}
