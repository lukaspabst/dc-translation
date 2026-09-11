import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  CacheType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';
import { getDynamicUILabels } from '../services/uiTranslator';
import { getLocalizedLanguageName } from '../utils/flags';
import { isPureMediaOrUrl } from '../utils/text';

export const data = new ContextMenuCommandBuilder()
  .setName('Translate (Permanent)')
  .setNameLocalizations({
    de: 'Dauerhaft übersetzen',
    'es-ES': 'Traducir (permanente)',
    fr: 'Traduire (permanent)',
    it: 'Traduci (permanente)',
  })
  .setType(ApplicationCommandType.Message);

export async function execute(interaction: MessageContextMenuCommandInteraction<CacheType>) {
  if (interaction.guildId) {
    const guildSettings = dbService.getGuildSettings(interaction.guildId);
    if (guildSettings.allow_public_translations === 'disabled') {
      await interaction.reply({
        content: 'Public translations are disabled in this server. Use **Apps > Translate** for private translation.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (guildSettings.allow_public_translations === 'admin_only') {
      const isStaff =
        interaction.memberPermissions?.has('ManageGuild') ||
        interaction.memberPermissions?.has('Administrator');
      if (!isStaff) {
        await interaction.reply({
          content:
            'Public channel translations are restricted to server staff to prevent channel clutter. Use **Apps > Translate** for private translation.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
  }

  await interaction.deferReply();

  try {
    const message = interaction.targetMessage;

    if (
      !message.content ||
      message.content.trim() === '' ||
      (message.stickers && message.stickers.size > 0 && isPureMediaOrUrl(message.content)) ||
      isPureMediaOrUrl(message.content)
    ) {
      await interaction.editReply({ content: 'This message has no text to translate.' });
      return;
    }

    const userPrefs = dbService.getUserPreferences(interaction.user.id);
    const targetLanguage = userPrefs.target_language;
    const translatedText = await translationService.translateWithGoogle(message.content, targetLanguage);
    const ui = await getDynamicUILabels(targetLanguage);
    const targetLangName = getLocalizedLanguageName(targetLanguage, interaction.locale);

    const embed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setTitle(`${ui.title} (${targetLangName})`);

    if (userPrefs.show_original) {
      embed.addFields({ name: ui.original, value: `>>> ${message.content.substring(0, 1000)}` });
    }

    embed.addFields({ name: ui.translated, value: translatedText.substring(0, 1000) });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`deepl_translate:${message.channelId}:${message.id}:${targetLanguage}`)
        .setLabel(ui.deeplBtn)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`livethread_open:${message.channelId}:${message.id}:${targetLanguage}`)
        .setLabel(ui.liveThreadBtn)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('translate_dismiss')
        .setLabel(ui.dismiss)
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      content: `<@${interaction.user.id}> ${ui.requestedBy}`,
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error('Translation error:', error);
    await interaction.editReply({ content: 'An error occurred while translating the message.' });
  }
}
