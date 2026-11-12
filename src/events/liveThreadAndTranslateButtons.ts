import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageFlags,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { ensureLiveThread, updateLiveThreadControlMessage } from '../commands/liveThread';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';
import { getDynamicUILabels } from '../services/uiTranslator';
import {
  BatchedMessageItem,
  createBatchedChannelEmbed,
  createLiveThreadMessageEmbed,
  createModernTranslationEmbed,
} from '../utils/embeds';
import {
  clearStoppedChannelForUser,
  clearThreadActivityHints,
  deliverBufferedMessagesToThread,
  markChannelStoppedForUser,
  notifyThreadUnreadActivity,
} from '../services/channelCatchup';
import { handleSetupAndSettingsButton } from './setupAndSettingsButtons';

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  if (await handleSetupAndSettingsButton(interaction)) {
    return;
  }
  const customId = interaction.customId;

  if (customId.startsWith('livethread_stop:')) {
    const threadId = customId.split(':')[1];
    if (!threadId) return;

    dbService.removeLiveThread(threadId);

    try {
      const threadChannel = await interaction.client.channels.fetch(threadId).catch(() => null);
      if (threadChannel && threadChannel.isThread()) {
        const parentId = threadChannel.parentId;
        if (parentId) {
          markChannelStoppedForUser(interaction.user.id, parentId);
        }
        await threadChannel.send('Live translation feed stopped by user. Archiving thread...').catch(() => {});
        await threadChannel.setArchived(true).catch(() => {});
      }
    } catch (err) {
      console.warn('Error archiving thread on stop:', err);
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          'Live translation feed stopped and thread archived. You can restart anytime by clicking Live Thread on any translation.',
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
    return;
  }

  if (customId.startsWith('livethread_mute:')) {
    const channelId = customId.split(':')[1];
    if (!channelId || !interaction.guildId) return;

    await dbService.muteChannel(interaction.user.id, channelId, interaction.guildId);

    const channel = interaction.guild
      ? interaction.guild.channels.cache.get(channelId) ||
        (await interaction.guild.channels.fetch(channelId).catch(() => null))
      : null;
    const channelName = channel && 'name' in channel ? channel.name : 'this channel';

    const thread = interaction.channel as ThreadChannel | null;
    if (thread && thread.isThread()) {
      const currentFocus = dbService.getThreadFocus(thread.id);
      await updateLiveThreadControlMessage(thread, currentFocus);
    }

    const unmuteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`livethread_unmute:${channelId}`)
        .setLabel(`Unmute #${channelName}`)
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content: `Muted #${channelName}.`,
      components: [unmuteRow],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId.startsWith('livethread_unmute:')) {
    const channelId = customId.split(':')[1];
    if (!channelId) return;

    await dbService.unmuteChannel(interaction.user.id, channelId);

    const channel = interaction.guild
      ? interaction.guild.channels.cache.get(channelId) ||
        (await interaction.guild.channels.fetch(channelId).catch(() => null))
      : null;
    const channelName = channel && 'name' in channel ? channel.name : 'this channel';

    const thread = interaction.channel as ThreadChannel | null;
    if (thread && thread.isThread()) {
      const currentFocus = dbService.getThreadFocus(thread.id);
      await updateLiveThreadControlMessage(thread, currentFocus);
    }

    await interaction.update({
      content: `Unmuted #${channelName}. Live translations for this channel have been restored.`,
      components: [],
    }).catch(async () => {
      await interaction.reply({
        content: `Unmuted #${channelName}. Live translations for this channel have been restored.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    });
    return;
  }

  if (customId.startsWith('livethread_list_muted:')) {
    const threadId = customId.split(':')[1];
    const thread = (await interaction.client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
    const guildId = interaction.guildId || thread?.guildId;
    const mutedChannelIds = dbService.getMutedChannels(interaction.user.id, guildId || undefined);

    if (mutedChannelIds.length === 0) {
      await interaction.reply({
        content: 'You have no muted channels in this server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const cId of mutedChannelIds.slice(0, 5)) {
      const ch = interaction.guild?.channels.cache.get(cId);
      const name = ch && 'name' in ch ? ch.name : cId;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`livethread_unmute:${cId}`)
          .setLabel(`Unmute #${name}`)
          .setStyle(ButtonStyle.Success)
      );
    }

    await interaction.reply({
      content: '**Muted channels:**',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId.startsWith('livethread_load_more:')) {
    const parts = customId.split(':');
    const channelId = parts[1];
    const beforeTimestamp = Number(parts[2]);
    if (!channelId || isNaN(beforeTimestamp)) return;

    if (interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(channelId);
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
            }).catch(() => {});
            return;
          }
        }
      }
    }

    await interaction.deferUpdate().catch(() => {});

    if (interaction.message && interaction.message.components.length > 0) {
      const updatedRows = interaction.message.components
        .map((row) => {
          if (!('components' in row)) return null;
          const newRow = new ActionRowBuilder<ButtonBuilder>();
          for (const comp of row.components) {
            if (comp.type === ComponentType.Button && comp.customId?.startsWith('livethread_load_more:')) {
              continue;
            }
            if (comp.type === ComponentType.Button) {
              newRow.addComponents(ButtonBuilder.from(comp as ButtonComponent));
            }
          }
          return newRow;
        })
        .filter((r): r is ActionRowBuilder<ButtonBuilder> => r !== null && r.components.length > 0);

      await interaction.message.edit({ components: updatedRows }).catch(() => {});
    }

    const thread = interaction.channel as ThreadChannel | null;
    if (!thread || !thread.isThread()) return;

    const olderItems = dbService.getOlderMessagesForChannel(channelId, beforeTimestamp, 50);
    if (olderItems.length === 0) return;

    const prefs = dbService.getUserPreferences(interaction.user.id);
    const validItems: BatchedMessageItem[] = [];

    for (const item of olderItems) {
      try {
        let translated: string;
        if (prefs.preferred_engine === 'deepl') {
          translated = await translationService.translateWithDeepL(
            item.original_text,
            prefs.target_language
          );
        } else {
          translated = await translationService.translateWithGoogle(
            item.original_text,
            prefs.target_language
          );
        }

        validItems.push({
          authorName: item.author_name,
          authorAvatar: item.author_avatar,
          translatedText: translated,
          originalText: item.original_text,
        });
      } catch (err) {
        console.error('Load more translation error:', err);
      }
    }

    if (validItems.length === 0) return;

    const channelName = olderItems[0].channel_name;
    const newOldestTimestamp = olderItems[0].created_at;
    const remainingOlder = dbService.getOlderMessagesCount(channelId, newOldestTimestamp);

    await thread
      .send(`› Loaded **${validItems.length}** earlier message${validItems.length > 1 ? 's' : ''} from **#${channelName}**`)
      .catch(() => {});

    const chunkSize = 8;
    const latestUrl = olderItems[olderItems.length - 1].url;
    for (let i = 0; i < validItems.length; i += chunkSize) {
      const chunk = validItems.slice(i, i + chunkSize);
      const isLastChunk = i + chunkSize >= validItems.length;
      const embed = createBatchedChannelEmbed({
        channelName,
        targetLanguage: prefs.target_language,
        items: chunk,
        showOriginal: prefs.show_original === 1,
      });

      const row = new ActionRowBuilder<ButtonBuilder>();
      if (isLastChunk && remainingOlder > 0) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`livethread_load_more:${channelId}:${newOldestTimestamp}`)
            .setLabel(`Load More (${remainingOlder})`)
            .setStyle(ButtonStyle.Primary)
        );
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`livethread_mute:${channelId}`)
          .setLabel(`Mute #${channelName}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Jump to Message')
          .setStyle(ButtonStyle.Link)
          .setURL(latestUrl)
      );

      await thread.send({ embeds: [embed], components: [row] }).catch(() => {});
    }
    return;
  }

  if (
    customId.startsWith('livethread_focus_btn:') ||
    customId.startsWith('livethread_catchup:')
  ) {
    const channelId = customId.split(':')[1];
    if (!channelId) return;

    if (interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(channelId);
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
            }).catch(() => {});
            return;
          }
        }
      }
    }

    await interaction.deferUpdate().catch(() => {});

    const thread = interaction.channel as ThreadChannel | null;
    if (thread && thread.isThread()) {
      if (interaction.message) {
        await interaction.message.delete().catch(() => {});
      }
      await clearThreadActivityHints(thread, interaction.message?.id);

      dbService.setThreadFocus(thread.id, channelId);
      await updateLiveThreadControlMessage(thread, channelId);

      const targetChannel = interaction.guild?.channels.cache.get(channelId);
      const channelName = targetChannel ? `#${targetChannel.name}` : 'this channel';

      const deliveredCount = await deliverBufferedMessagesToThread(
        interaction.client,
        thread.id,
        interaction.user.id,
        channelId
      );

      if (deliveredCount === 0) {
        await thread.send(`› Focus switched to **${channelName}**`).catch(() => {});
      }

      if (dbService.isChannelMuted(interaction.user.id, channelId)) {
        const unmuteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`livethread_unmute:${channelId}`)
            .setLabel(`Unmute ${channelName}`)
            .setStyle(ButtonStyle.Success)
        );
        await thread.send({
          content: `**${channelName}** is currently muted. You will not receive live translations until you unmute it.`,
          components: [unmuteRow],
        }).catch(() => {});
      }

      await notifyThreadUnreadActivity(interaction.client, thread.id, interaction.user.id, interaction.guild);
    }
    return;
  }

  if (
    customId.startsWith('livethread_focus_all:') ||
    customId.startsWith('livethread_catchup_all:')
  ) {
    const threadId = customId.split(':')[1];
    if (!threadId) return;

    await interaction.deferUpdate().catch(() => {});

    const thread = (await interaction.client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
    if (thread && thread.isThread()) {
      if (interaction.message) {
        await interaction.message.delete().catch(() => {});
      }
      await clearThreadActivityHints(thread, interaction.message?.id);

      dbService.setThreadFocus(threadId, 'all');
      await updateLiveThreadControlMessage(thread, 'all');
      const deliveredCount = await deliverBufferedMessagesToThread(
        interaction.client,
        threadId,
        interaction.user.id
      );

      if (deliveredCount === 0) {
        await thread.send('› Focus switched to **All Channels**').catch(() => {});
      }

      await notifyThreadUnreadActivity(interaction.client, threadId, interaction.user.id, interaction.guild);
    }
    return;
  }

  if (customId.startsWith('livethread_open:')) {
    const parts = customId.split(':');
    if (parts.length < 4) return;
    const channelId = parts[1];
    const messageId = parts[2];
    const targetLanguage = parts[3];

    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Live thread translation is only available in server channels.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildSettings = dbService.getGuildSettings(interaction.guildId);
    if (guildSettings.allow_live_threads === 'disabled') {
      await interaction.reply({
        content: 'Live translation threads are disabled in this server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (guildSettings.allow_live_threads === 'admin_only') {
      const isStaff =
        interaction.memberPermissions?.has('ManageGuild') ||
        interaction.memberPermissions?.has('Administrator');
      if (!isStaff) {
        await interaction.reply({
          content: 'Live translation threads are restricted to server staff in this server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = await interaction.client.channels.fetch(channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.editReply({
          content: 'Live translation threads can only be opened in standard text channels.',
        });
        return;
      }

      const textChannel = channel as TextChannel;
      const thread = await ensureLiveThread({
        channel: textChannel,
        user: interaction.user,
        targetLanguage,
      });

      if (!thread) {
        await interaction.editReply({
          content:
            'Could not create live thread. Please verify bot permissions (`Create Private Threads`, `Send Messages in Threads`).',
        });
        return;
      }

      clearStoppedChannelForUser(interaction.user.id, channelId);

      if (messageId && messageId !== '0') {
        const targetMsg = await textChannel.messages.fetch(messageId).catch(() => null);
        if (targetMsg && targetMsg.content) {
          const userPrefs = dbService.getUserPreferences(interaction.user.id);
          const translated = await translationService.translateWithGoogle(
            targetMsg.content,
            targetLanguage
          );
          const channelName = textChannel.name;
          const msgEmbed = createLiveThreadMessageEmbed(
            targetMsg.author,
            translated,
            targetLanguage,
            channelName,
            targetMsg.content,
            userPrefs.show_original === 1
          );
          const jumpRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel('Jump to Message')
              .setStyle(ButtonStyle.Link)
              .setURL(targetMsg.url)
          );
          await thread.send({ embeds: [msgEmbed], components: [jumpRow] });
        }
      }

      const threadRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Open Live Thread')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guildId}/${thread.id}`)
      );

      await interaction.editReply({
        content: `Live translation thread active: <#${thread.id}>\nTranslations in this channel will stream directly to your private thread!`,
        components: [threadRow],
      });
    } catch (err: unknown) {
      console.error('Error opening live thread:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      await interaction.editReply({
        content: `Error opening live thread: ${errMsg}`,
      });
    }
    return;
  }

  if (customId.startsWith('translate_share:')) {
    const parts = customId.split(':');
    if (parts.length !== 4) return;
    const channelId = parts[1];
    const messageId = parts[2];
    const targetLanguage = parts[3];

    if (interaction.guildId) {
      const guildSettings = dbService.getGuildSettings(interaction.guildId);
      if (guildSettings.allow_public_translations === 'disabled') {
        await interaction.reply({
          content: 'Sharing translations publicly is disabled in this server.',
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
              'Sharing translations to public channels is restricted to server staff to prevent channel clutter.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    try {
      const channel = await interaction.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel) || !('send' in channel)) return;
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

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`deepl_translate:${channelId}:${messageId}:${targetLanguage}`)
          .setLabel(ui.deeplBtn)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('translate_dismiss')
          .setLabel(ui.dismiss)
          .setStyle(ButtonStyle.Danger)
      );

      await (channel as unknown as { send: (payload: unknown) => Promise<unknown> }).send({
        content: `<@${interaction.user.id}> ${ui.requestedBy}`,
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content: 'Translation shared with channel.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('Error sharing translation:', err);
    }
    return;
  }

  if (customId.startsWith('deepl_translate:')) {
    await handleDeepLButton(interaction);
    return;
  }

  if (customId.startsWith('translate_text_deepl:')) {
    const targetLanguage = customId.split(':')[1] || 'en';
    await interaction.deferUpdate();
    const existingEmbed = interaction.message.embeds[0];
    if (!existingEmbed) return;

    const originalField = existingEmbed.fields.find((f) => f.name.includes('Original'));
    const textToTranslate = originalField
      ? originalField.value.replace(/^>>>\s*/, '')
      : existingEmbed.fields[0]?.value;

    if (!textToTranslate) return;

    try {
      const translated = await translationService.translateWithDeepL(
        textToTranslate,
        targetLanguage
      );
      const ui = await getDynamicUILabels(targetLanguage);
      const updatedEmbed = EmbedBuilder.from(existingEmbed)
        .setColor('#8B5CF6')
        .setTitle(`${ui.title} (DeepL)`)
        .setFields(
          existingEmbed.fields.map((field) => {
            if (field.name.includes('Translated') || field.name === ui.translated) {
              return { name: `${ui.translated} (DeepL)`, value: translated.substring(0, 1024) };
            }
            return field;
          })
        );

      const dismissRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('translate_dismiss')
          .setLabel(ui.dismiss)
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({ embeds: [updatedEmbed], components: [dismissRow] });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'DeepL error occurred';
      await interaction.followUp({ content: errMsg, flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleDeepLButton(interaction: ButtonInteraction) {
  await interaction.deferUpdate();

  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const channelId = parts[1];
  const messageId = parts[2];
  const targetLanguage = parts[3];

  try {
    const channel = await interaction.client.channels.fetch(channelId);
    if (!channel || !('messages' in channel)) {
      throw new Error('Could not fetch channel');
    }

    const message: Message = await channel.messages.fetch(messageId);
    if (!message.content) {
      await interaction.followUp({
        content: 'Original message content is empty.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const translatedText = await translationService.translateWithDeepL(
      message.content,
      targetLanguage
    );
    const ui = await getDynamicUILabels(targetLanguage);
    const userPrefs = dbService.getUserPreferences(interaction.user.id);

    const embed = createModernTranslationEmbed({
      author: message.author,
      translatedText,
      targetLanguage,
      originalText: message.content,
      showOriginal: userPrefs.show_original === 1,
      engine: 'deepl',
      locale: interaction.locale,
    });

    const dismissRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`livethread_open:${channelId}:${messageId}:${targetLanguage}`)
        .setLabel(ui.liveThreadBtn)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('translate_dismiss')
        .setLabel(ui.dismiss)
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [dismissRow],
    });
  } catch (error: unknown) {
    console.error('DeepL translation button error:', error);
    const errMsg = error instanceof Error ? error.message : 'An error occurred';
    await interaction.followUp({
      content: errMsg,
      flags: MessageFlags.Ephemeral,
    });
  }
}
