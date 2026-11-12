import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  Message,
  MessageReaction,
  TextChannel,
  ThreadChannel,
  User,
} from 'discord.js';
import * as setupCommand from '../commands/setup';
import { ensureLiveThread } from '../commands/liveThread';
import { runServerSetupBroadcast } from '../commands/broadcastSetup';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';
import { getDynamicSetupLabels, getDynamicUILabels } from '../services/uiTranslator';
import { enqueueThreadMessage } from '../services/messageBatcher';
import { notifyThreadUnreadActivity } from '../services/channelCatchup';
import { getLanguageCodeFromFlag } from '../utils/flags';
import { createLiveThreadMessageEmbed, createModernTranslationEmbed } from '../utils/embeds';
import { isBotCommand, isPureMediaOrUrl, isUntranslatable } from '../utils/text';

export function registerMessageAndReactionHandlers(client: Client): void {
client.on(Events.MessageReactionAdd, async (reaction: MessageReaction | unknown, user: User | unknown) => {
  const discordUser = user as User;
  if (!discordUser || discordUser.bot) return;

  const msgReaction = reaction as MessageReaction;
  if (msgReaction.partial) {
    try {
      await msgReaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  const message = msgReaction.message;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.error('Error fetching message:', error);
      return;
    }
  }

  if (
    !message.content ||
    message.content.trim() === '' ||
    (message.stickers && message.stickers.size > 0 && isPureMediaOrUrl(message.content)) ||
    isPureMediaOrUrl(message.content)
  ) return;

  const emojiName = msgReaction.emoji.name;
  if (!emojiName) return;

  const targetLanguage = getLanguageCodeFromFlag(emojiName);
  if (!targetLanguage) return;

  console.log(`[Reaction] Emoji: "${emojiName}" -> Target: "${targetLanguage}" from user: ${discordUser.id}`);

  try {
    const userPrefs = dbService.getUserPreferences(discordUser.id);
    if (!userPrefs.setup_completed) {
      dbService.setUserLanguage(discordUser.id, targetLanguage);
      dbService.setSetupCompleted(discordUser.id, true);
    }

    const translatedText = await translationService.translateWithGoogle(
      message.content,
      targetLanguage
    );
    const ui = await getDynamicUILabels(targetLanguage);

    const embed = createModernTranslationEmbed({
      author: message.author,
      translatedText,
      targetLanguage,
      originalText: message.content,
      showOriginal: userPrefs.show_original === 1,
      engine: 'google',
      locale: targetLanguage,
    });

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

    const guildSettings = message.guildId ? dbService.getGuildSettings(message.guildId) : null;
    const allowFlagReactions = guildSettings ? guildSettings.flag_channel_reply_allowed : true;

    if (!allowFlagReactions) {
      await msgReaction.users.remove(discordUser.id).catch(() => {});
      return;
    }

    const messagePayload = {
      content: `<@${discordUser.id}> ${ui.requestedBy}`,
      embeds: [embed],
      components: [row],
    };

    let replyMsg: Message | null = null;
    try {
      replyMsg = await message.reply(messagePayload);
    } catch (replyError) {
      console.warn('Failed to reply, falling back to channel send:', replyError);
      if (message.channel && 'send' in message.channel) {
        replyMsg = (await (
          message.channel as unknown as { send: (payload: unknown) => Promise<Message> }
        ).send(messagePayload)) as Message;
      }
    }

    if (userPrefs.flag_duration > 0 && replyMsg) {
      setTimeout(() => {
        replyMsg?.delete().catch(() => {});
      }, userPrefs.flag_duration * 60000);
    }

    await msgReaction.users.remove(discordUser.id).catch(() => {});
  } catch (error) {
    console.error('Reaction translation error:', error);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  if (!client.isReady()) return;
  if (dbService.isGuildBroadcastDone(guild.id)) return;

  console.log(`Bot joined new guild ${guild.name} (${guild.id}). Starting setup broadcast...`);
  try {
    const stats = await runServerSetupBroadcast(guild);
    console.log(
      `Setup broadcast completed for guild ${guild.name} (${guild.id}): ` +
        `${stats.delivered} delivered, ${stats.closedDms} closed DMs, ${stats.alreadySetup} already setup.`
    );
  } catch (err) {
    console.error(`Error during setup broadcast for guild ${guild.id}:`, err);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;
  if (dbService.isSetupPromptNeeded(member.id)) {
    dbService.setSetupStatus(member.id, 'pending');
    const labels = await getDynamicSetupLabels(member.guild.preferredLocale);
    const { embed, components, files } = setupCommand.buildFirstUseIntercept(
      member.user.username,
      member.guild.preferredLocale,
      labels
    );
    await member.send({ embeds: [embed], components, files }).catch(() => {});
  }
});

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot || message.system || message.webhookId || !message.guild) return;

  if (message.channel.isThread()) {
    const threadChannel = message.channel as ThreadChannel;
    const isTranslationThread =
      dbService.isLiveThread(threadChannel.id) ||
      threadChannel.name.startsWith('Translations ›') ||
      threadChannel.name.startsWith('Translations -');

    if (isTranslationThread) {
      await message.delete().catch(() => {});
      if (threadChannel.locked) {
        await threadChannel.setLocked(false).catch(() => {});
      }
    }
    return;
  }

  if (message.stickers && message.stickers.size > 0 && (!message.content || isPureMediaOrUrl(message.content))) return;
  if (!message.content || message.content.trim().length < 2) return;
  if (isBotCommand(message.content)) return;
  if (isUntranslatable(message.content)) return;
  if (isPureMediaOrUrl(message.content)) return;

  if (dbService.isSetupPromptNeeded(message.author.id)) {
    dbService.setSetupStatus(message.author.id, 'pending');
    const serverLocale = message.guild.preferredLocale || 'en';
    const labels = await getDynamicSetupLabels(serverLocale);
    const { embed, components, files } = setupCommand.buildFirstUseIntercept(
      message.author.username,
      serverLocale,
      labels
    );
    await message.author.send({ embeds: [embed], components, files }).catch(() => {});
  }

  const subscribers = dbService.getAllAutoTranslateDmUsers();
  for (const subscriber of subscribers) {
    if (subscriber.discord_id === message.author.id) continue;

    try {
      const member =
        message.guild.members.cache.get(subscriber.discord_id) ||
        (await message.guild.members.fetch(subscriber.discord_id).catch(() => null));
      if (!member) continue;

      const channelPerms =
        'permissionsFor' in message.channel
          ? (message.channel as TextChannel).permissionsFor(member)
          : null;
      if (
        !channelPerms ||
        !channelPerms.has('ViewChannel') ||
        !channelPerms.has('ReadMessageHistory')
      ) {
        continue;
      }

      const translated = await translationService.translateWithGoogle(
        message.content,
        subscriber.target_language
      );

      if (translated.trim().toLowerCase() === message.content.trim().toLowerCase()) {
        continue;
      }

      const user = await client.users.fetch(subscriber.discord_id).catch(() => null);
      if (!user) continue;

      const channelName =
        'name' in message.channel ? (message.channel as { name: string }).name : 'chat';
      const embed = createLiveThreadMessageEmbed(
        message.author,
        translated,
        subscriber.target_language,
        channelName,
        message.content,
        subscriber.show_original === 1
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Jump to Message')
          .setStyle(ButtonStyle.Link)
          .setURL(message.url)
      );

      await user.send({ embeds: [embed], components: [row] }).catch(() => {});
    } catch (err) {
      console.error('Error sending auto-DM translation:', err);
    }
  }

  if (message.channel.type === ChannelType.GuildText) {
    const textChannel = message.channel as TextChannel;
    const guildSettings = dbService.getGuildSettings(message.guild.id);
    const threadsAllowed = guildSettings.allow_live_threads !== 'disabled';

    if (threadsAllowed) {
      const autoThreadUsers = dbService.getAllAutoTranslateThreadUsers();
      for (const autoUser of autoThreadUsers) {
        const existing = dbService.getUserLiveThread(autoUser.discord_id, message.guild.id);
        let activeThread: ThreadChannel | null = null;
        if (existing) {
          activeThread = (await client.channels
            .fetch(existing.thread_id)
            .catch(() => null)) as ThreadChannel | null;
          if (!activeThread || !activeThread.isThread()) {
            dbService.removeLiveThread(existing.thread_id);
            activeThread = null;
          }
        }

        if (!activeThread) {
          const member =
            message.guild.members.cache.get(autoUser.discord_id) ||
            (await message.guild.members.fetch(autoUser.discord_id).catch(() => null));
          if (member) {
            if (
              guildSettings.allow_live_threads !== 'admin_only' ||
              member.permissions.has('ManageGuild') ||
              member.permissions.has('Administrator')
            ) {
              await ensureLiveThread({
                channel: textChannel,
                user: member.user,
                targetLanguage: autoUser.target_language,
              }).catch(() => null);
            }
          }
        }
      }

      dbService.saveChannelMessage({
        id: message.id,
        guild_id: message.guild.id,
        channel_id: textChannel.id,
        channel_name: textChannel.name,
        author_name: message.author.displayName || message.author.username,
        author_avatar: message.author.displayAvatarURL({ size: 64 }),
        original_text: message.content,
        url: message.url,
        created_at: Math.floor(message.createdTimestamp / 1000),
      });

      const liveThreads = dbService.getLiveThreadsForGuild(message.guild.id);
      for (const lt of liveThreads) {
        if (lt.discord_id === message.author.id) continue;

        try {
          const member =
            message.guild.members.cache.get(lt.discord_id) ||
            (await message.guild.members.fetch(lt.discord_id).catch(() => null));
          if (!member) continue;

          if (guildSettings.allow_live_threads === 'admin_only') {
            const isStaff =
              member.permissions.has('ManageGuild') ||
              member.permissions.has('Administrator');
            if (!isStaff) continue;
          }

          const perms = textChannel.permissionsFor(member);
          if (
            !perms ||
            !perms.has('ViewChannel') ||
            !perms.has('ReadMessageHistory')
          ) {
            continue;
          }

          if (dbService.isChannelMuted(lt.discord_id, textChannel.id)) {
            continue;
          }

          const currentFocus = dbService.getThreadFocus(lt.thread_id);
          const isFocused = currentFocus === 'all' || currentFocus === textChannel.id;

          const prefs = dbService.getUserPreferences(lt.discord_id);
          const channelName = textChannel.name;
          const authorName = message.author.displayName || message.author.username;
          const authorAvatar = message.author.displayAvatarURL({ size: 64 });

          if (isFocused) {
            dbService.updateUserChannelRead(lt.discord_id, textChannel.id, Math.floor(Date.now() / 1000));
            enqueueThreadMessage({
              threadId: lt.thread_id,
              threadUserId: lt.discord_id,
              channelId: textChannel.id,
              channelName,
              targetLanguage: lt.target_language,
              showOriginal: prefs.show_original === 1,
              message: {
                id: message.id,
                content: message.content,
                authorId: message.author.id,
                authorName,
                authorAvatar,
                url: message.url,
              },
              client,
            });
          } else {
            await notifyThreadUnreadActivity(client, lt.thread_id, lt.discord_id, message.guild);
          }
        } catch (err) {
          console.error('Error queuing batched thread message:', err);
        }
      }
    }
  }
});
}
