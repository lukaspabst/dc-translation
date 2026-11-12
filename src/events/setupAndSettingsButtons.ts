import {
  ActionRowBuilder,
  ButtonInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import * as setupCommand from '../commands/setup';
import * as settingsCommand from '../commands/settings';
import * as serverSettingsCommand from '../commands/serverSettings';
import { ensureLiveThread, syncUserLiveThreadLanguage } from '../commands/liveThread';
import { dbService, PermissionScope } from '../db/database';
import { getEffectiveLanguage, mapDiscordLocaleToLanguage } from '../utils/flags';
import {
  getDynamicServerLabels,
  getDynamicSetupLabels,
  getDynamicSettingsLabels,
} from '../services/uiTranslator';
import { resolveTargetTextChannelForUser } from '../services/channelCatchup';

export async function handleSetupAndSettingsButton(
  interaction: ButtonInteraction
): Promise<boolean> {
  const customId = interaction.customId;

  if (customId === 'translate_dismiss') {
    try {
      if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
        await interaction.deleteReply().catch(async () => {
          await interaction.update({ content: 'Dismissed.', embeds: [], components: [] });
        });
      } else {
        await interaction.message.delete().catch(() => {});
      }
    } catch (e) {
      console.error('Dismiss error:', e);
    }
    return true;
  }

  if (customId === 'setup_detect_client') {
    const clientLangCode = mapDiscordLocaleToLanguage(interaction.locale);
    const labels = await getDynamicSetupLabels(interaction.locale);
    const { embed, components, files } = setupCommand.buildClientDetectedPrompt(
      interaction.user.username,
      clientLangCode,
      interaction.locale,
      labels
    );
    await interaction.update({ embeds: [embed], components, files });
    return true;
  }

  if (customId === 'setup_step:1') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components, files: [] });
    return true;
  }

  if (customId === 'setup_open_search_modal') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const modal = new ModalBuilder()
      .setCustomId('setup_search_modal')
      .setTitle(labels.searchModalTitle.slice(0, 45));

    const searchInput = new TextInputBuilder()
      .setCustomId('setup_search_query')
      .setLabel(labels.searchModalLabel.slice(0, 45))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(labels.searchModalPlaceholder.slice(0, 100))
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(50);

    const modalRow = new ActionRowBuilder<TextInputBuilder>().addComponents(searchInput);
    modal.addComponents(modalRow);
    await interaction.showModal(modal);
    return true;
  }

  if (customId === 'setup_reset_search') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId.startsWith('setup_page:')) {
    const pageStr = customId.split(':')[1];
    const page = parseInt(pageStr, 10) || 0;
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      page,
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId.startsWith('setup_step:2')) {
    const parts = customId.split(':');
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (parts.length > 2 && parts[2]) {
      prefs.target_language = parts[2];
      await dbService.saveUserPreferences(prefs);
      dbService.updateUserLiveThreadsLanguage(interaction.user.id, parts[2]);
      if (interaction.guild) {
        await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, parts[2]);
      }
    }
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components, files: [] });
    return true;
  }

  if (customId === 'setup_step:3') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep3(prefs, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId === 'setup_mode:ephemeral') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    prefs.auto_translate_dm = false;
    prefs.auto_translate_thread = false;
    prefs.flag_mode = 'channel';
    await dbService.saveUserPreferences(prefs);
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId === 'setup_mode:dm') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    prefs.auto_translate_dm = true;
    prefs.auto_translate_thread = false;
    prefs.flag_mode = 'channel';
    await dbService.saveUserPreferences(prefs);
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId === 'setup_mode:thread') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    prefs.auto_translate_dm = false;
    prefs.auto_translate_thread = true;
    prefs.flag_mode = 'channel';
    await dbService.saveUserPreferences(prefs);
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId === 'setup_toggle_original') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    dbService.setShowOriginal(interaction.user.id, !prefs.show_original);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep3(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId === 'setup_toggle_engine') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const newEngine = prefs.preferred_engine === 'deepl' ? 'google' : 'deepl';
    dbService.setPreferredEngine(interaction.user.id, newEngine);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep3(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId === 'setup_finish') {
    dbService.setSetupCompleted(interaction.user.id, true);
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildCompletion(prefs, effectiveLang, labels);

    if (prefs.auto_translate_thread) {
      const targetChannel = await resolveTargetTextChannelForUser(
        interaction.client,
        interaction.user.id,
        interaction.guildId
      );
      if (targetChannel) {
        const thread = await ensureLiveThread({
          channel: targetChannel,
          user: interaction.user,
          targetLanguage: prefs.target_language,
        });
        if (thread) {
          embed.addFields({
            name: 'Live Thread Ready',
            value: `Your private thread <#${thread.id}> is active in #${targetChannel.name}! Translations will stream automatically.`,
            inline: false,
          });
        }
      }
    }

    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId.startsWith('setup_quick_start:') || customId === 'setup_quick_finish') {
    const parts = customId.split(':');
    const chosenLang = parts.length > 1 ? parts[1] : undefined;
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (chosenLang) {
      prefs.target_language = chosenLang;
    } else if (!prefs.target_language || prefs.target_language === 'en') {
      if (interaction.locale) {
        prefs.target_language = mapDiscordLocaleToLanguage(interaction.locale);
      }
    }
    prefs.preferred_engine = 'google';
    prefs.show_original = 1;
    prefs.flag_duration = 3;
    prefs.flag_mode = 'channel';
    prefs.auto_translate_dm = false;
    prefs.auto_translate_thread = true;
    prefs.setup_completed = true;
    await dbService.saveUserPreferences(prefs);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildCompletion(prefs, effectiveLang, labels);

    if (prefs.auto_translate_thread) {
      const targetChannel = await resolveTargetTextChannelForUser(
        interaction.client,
        interaction.user.id,
        interaction.guildId
      );
      if (targetChannel) {
        const thread = await ensureLiveThread({
          channel: targetChannel,
          user: interaction.user,
          targetLanguage: prefs.target_language,
        });
        if (thread) {
          embed.addFields({
            name: 'Live Thread Ready',
            value: `Your private thread <#${thread.id}> is active in #${targetChannel.name}! Translations will stream automatically.`,
            inline: false,
          });
        }
      }
    }

    await interaction.update({ embeds: [embed], components });
    return true;
  }

  if (customId.startsWith('server_toggle_threads:')) {
    if (!interaction.guildId) return true;
    const isStaff =
      interaction.memberPermissions?.has('ManageGuild') ||
      interaction.memberPermissions?.has('Administrator');
    if (!isStaff) {
      await interaction.reply({
        content: 'Only server staff can configure server guardrails.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    const nextScope = customId.split(':')[1] as PermissionScope;
    await dbService.setGuildLiveThreads(interaction.guildId, nextScope);
    const settings = dbService.getGuildSettings(interaction.guildId);
    const labels = await getDynamicServerLabels(interaction.locale);
    const embed = serverSettingsCommand.buildServerSettingsEmbed(settings, interaction.locale, labels);
    const [row1, row2] = serverSettingsCommand.buildServerSettingsComponents(settings, interaction.locale, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    return true;
  }

  if (customId.startsWith('server_toggle_public:')) {
    if (!interaction.guildId) return true;
    const isStaff =
      interaction.memberPermissions?.has('ManageGuild') ||
      interaction.memberPermissions?.has('Administrator');
    if (!isStaff) {
      await interaction.reply({
        content: 'Only server staff can configure server guardrails.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    const nextScope = customId.split(':')[1] as PermissionScope;
    await dbService.setGuildPublicTranslations(interaction.guildId, nextScope);
    const settings = dbService.getGuildSettings(interaction.guildId);
    const labels = await getDynamicServerLabels(interaction.locale);
    const embed = serverSettingsCommand.buildServerSettingsEmbed(settings, interaction.locale, labels);
    const [row1, row2] = serverSettingsCommand.buildServerSettingsComponents(settings, interaction.locale, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    return true;
  }

  if (customId === 'server_toggle_flags') {
    if (!interaction.guildId) return true;
    const isStaff =
      interaction.memberPermissions?.has('ManageGuild') ||
      interaction.memberPermissions?.has('Administrator');
    if (!isStaff) {
      await interaction.reply({
        content: 'Only server staff can configure server guardrails.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    const current = dbService.getGuildSettings(interaction.guildId);
    await dbService.setGuildFlagChannelReply(interaction.guildId, !current.flag_channel_reply_allowed);
    const settings = dbService.getGuildSettings(interaction.guildId);
    const labels = await getDynamicServerLabels(interaction.locale);
    const embed = serverSettingsCommand.buildServerSettingsEmbed(settings, interaction.locale, labels);
    const [row1, row2] = serverSettingsCommand.buildServerSettingsComponents(settings, interaction.locale, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    return true;
  }

  if (customId === 'settings_open_from_help') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(prefs, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(prefs, effectiveLang, labels);
    await interaction.reply({
      embeds: [embed],
      components: [row1, row2, row3, row4],
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (customId === 'settings_toggle_original') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    dbService.setShowOriginal(interaction.user.id, !prefs.show_original);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(updated, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return true;
  }

  if (customId.startsWith('settings_mode:')) {
    const mode = customId.split(':')[1];
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (mode === 'thread') {
      prefs.auto_translate_thread = true;
      prefs.auto_translate_dm = false;
      prefs.flag_mode = 'channel';
    } else if (mode === 'dm') {
      prefs.auto_translate_thread = false;
      prefs.auto_translate_dm = true;
      prefs.flag_mode = 'channel';
    } else {
      prefs.auto_translate_thread = false;
      prefs.auto_translate_dm = false;
      prefs.flag_mode = 'channel';
    }
    await dbService.saveUserPreferences(prefs);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(updated, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return true;
  }

  if (customId === 'settings_toggle_engine') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const newEngine = prefs.preferred_engine === 'deepl' ? 'google' : 'deepl';
    dbService.setPreferredEngine(interaction.user.id, newEngine);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(updated, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return true;
  }

  return false;
}
