import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  ThreadChannel,
} from 'discord.js';
import * as setupCommand from '../commands/setup';
import * as settingsCommand from '../commands/settings';
import * as translateContextCommand from '../commands/translateContext';
import {
  buildLiveThreadControlComponents,
  syncUserLiveThreadLanguage,
} from '../commands/liveThread';
import { dbService } from '../db/database';
import { getEffectiveLanguage, searchLanguages } from '../utils/flags';
import {
  getDynamicSetupLabels,
  getDynamicSettingsLabels,
  getDynamicUILabels,
} from '../services/uiTranslator';
import { translationService } from '../services/translator';
import { createModernTranslationEmbed } from '../utils/embeds';
import {
  deliverBufferedMessagesToThread,
  notifyThreadUnreadActivity,
} from '../services/channelCatchup';

export async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
  const customId = interaction.customId;

  if (customId === 'setup_select_lang') {
    const selected = interaction.values[0];
    dbService.setUserLanguage(interaction.user.id, selected);
    if (interaction.guild) {
      await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, selected);
    }
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(selected, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId === 'settings_select_lang') {
    const selected = interaction.values[0];
    dbService.setUserLanguage(interaction.user.id, selected);
    if (interaction.guild) {
      await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, selected);
    }
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(selected, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(prefs, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(prefs, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return;
  }

  if (customId === 'settings_select_duration') {
    const minutes = parseInt(interaction.values[0], 10);
    dbService.setFlagDuration(interaction.user.id, minutes);
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(prefs, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(prefs, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return;
  }

  if (customId.startsWith('livethread_focus:')) {
    const threadId = customId.split(':')[1];
    if (!threadId) return;

    const selectedValue = interaction.values[0];
    const isAll = selectedValue === 'focus:all';
    const targetChannelId = isAll ? 'all' : selectedValue.replace('focus:', '');

    if (!isAll && interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
      if (targetChannel) {
        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
          const perms = targetChannel.permissionsFor(member);
          if (!perms || !perms.has('ViewChannel') || !perms.has('ReadMessageHistory')) {
            await interaction.reply({
              content: 'You do not have permission to view this channel.',
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
        }
      }
    }

    dbService.setThreadFocus(threadId, targetChannelId);

    let channelName = 'All Channels';
    if (!isAll && interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
      if (targetChannel) {
        channelName = `#${targetChannel.name}`;
      }
    }

    if (interaction.guild) {
      const member =
        interaction.member instanceof GuildMember
          ? interaction.member
          : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const [selectRow, stopRow] = buildLiveThreadControlComponents(
        interaction.guild,
        member,
        threadId,
        targetChannelId
      );
      const currentEmbed = interaction.message.embeds[0];
      if (currentEmbed) {
        const focusLabel = isAll ? 'All Channels (Default)' : channelName;
        const newEmbed = EmbedBuilder.from(currentEmbed);
        const fields = currentEmbed.fields.map((f) => {
          if (f.name === 'Feed Focus') {
            return { ...f, value: `\`${focusLabel}\`` };
          }
          return f;
        });
        newEmbed.setFields(fields);
        await interaction.update({ embeds: [newEmbed], components: [selectRow, stopRow] }).catch(() => {});
      } else {
        await interaction.update({ components: [selectRow, stopRow] }).catch(() => {});
      }
    }

    const deliveredCount = isAll
      ? await deliverBufferedMessagesToThread(interaction.client, threadId, interaction.user.id)
      : await deliverBufferedMessagesToThread(
          interaction.client,
          threadId,
          interaction.user.id,
          targetChannelId
        );

    const thread = (await interaction.client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
    if (thread && thread.isThread()) {
      if (deliveredCount === 0) {
        await thread.send(`› Focus switched to **${channelName}**`).catch(() => {});
      }

      if (!isAll && dbService.isChannelMuted(interaction.user.id, targetChannelId)) {
        const unmuteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`livethread_unmute:${targetChannelId}`)
            .setLabel(`Unmute ${channelName}`)
            .setStyle(ButtonStyle.Success)
        );
        await thread.send({
          content: `**${channelName}** is currently muted. You will not receive live translations until you unmute it.`,
          components: [unmuteRow],
        }).catch(() => {});
      }
    }

    await notifyThreadUnreadActivity(interaction.client, threadId, interaction.user.id, interaction.guild);
    return;
  }

  if (customId.startsWith('translate_switch:')) {
    const parts = customId.split(':');
    if (parts.length !== 3) return;
    const channelId = parts[1];
    const messageId = parts[2];
    const targetLanguage = interaction.values[0];

    await interaction.deferUpdate();

    try {
      const channel = await interaction.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) return;
      const targetMsg = await channel.messages.fetch(messageId);
      if (!targetMsg.content) return;

      const userPrefs = dbService.getUserPreferences(interaction.user.id);
      const translatedText = await translationService.translateWithGoogle(
        targetMsg.content,
        targetLanguage
      );
      const ui = await getDynamicUILabels(targetLanguage);

      const embed = createModernTranslationEmbed({
        author: targetMsg.author,
        translatedText,
        targetLanguage,
        originalText: targetMsg.content,
        showOriginal: userPrefs.show_original === 1,
        engine: 'google',
        locale: interaction.locale,
      });

      const [selectRow, buttonsRow] = translateContextCommand.buildTranslationComponents(
        channelId,
        messageId,
        targetLanguage,
        true,
        ui,
        interaction.locale
      );

      await interaction.editReply({
        embeds: [embed],
        components: [selectRow, buttonsRow],
      });
    } catch (err) {
      console.error('Error switching language:', err);
    }
  }
}

export async function handleModalSubmitInteraction(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;

  if (customId === 'setup_search_modal') {
    const query = interaction.fields.getTextInputValue('setup_search_query');
    let prefs = dbService.getUserPreferences(interaction.user.id);
    const currentEffective = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const matches = searchLanguages(query, currentEffective);

    if (matches.length === 1) {
      const chosenLang = matches[0].code;
      dbService.setUserLanguage(interaction.user.id, chosenLang);
      if (interaction.guild) {
        await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, chosenLang);
      }
      prefs = dbService.getUserPreferences(interaction.user.id);
      const effectiveLang = getEffectiveLanguage(chosenLang, interaction.locale);
      const labels = await getDynamicSetupLabels(effectiveLang);
      const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
        page: 0,
        searchQuery: query,
        searchResults: matches,
        clientLocale: interaction.locale,
      });
      if (interaction.isFromMessage()) {
        await interaction.update({ embeds: [embed], components });
      } else {
        await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    if (matches.length > 1) {
      const labels = await getDynamicSetupLabels(currentEffective);
      const { embed, components } = setupCommand.buildStep1(prefs, currentEffective, labels, {
        page: 0,
        searchQuery: query,
        searchResults: matches,
        clientLocale: interaction.locale,
      });
      if (interaction.isFromMessage()) {
        await interaction.update({ embeds: [embed], components });
      } else {
        await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    const labels = await getDynamicSetupLabels(currentEffective);
    const { embed, components } = setupCommand.buildStep1(prefs, currentEffective, labels, {
      page: 0,
      searchQuery: query,
      searchNotice: labels.noSearchMatch(query),
      clientLocale: interaction.locale,
    });
    if (interaction.isFromMessage()) {
      await interaction.update({ embeds: [embed], components });
    } else {
      await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
    }
    return;
  }
}
