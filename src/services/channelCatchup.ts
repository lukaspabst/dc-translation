import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { dbService } from '../db/database';
import { translationService } from './translator';
import { createBatchedChannelEmbed, BatchedMessageItem } from '../utils/embeds';

const MAX_STOPPED_USERS = 2000;
const MAX_UNREAD_THREADS = 2000;
const userStoppedChannels = new Map<string, Set<string>>();
const lastUnreadMessagePerThread = new Map<string, string>();

export function markChannelStoppedForUser(userId: string, channelId: string): void {
  let stopped = userStoppedChannels.get(userId);
  if (!stopped) {
    if (userStoppedChannels.size >= MAX_STOPPED_USERS) {
      const oldestKey = userStoppedChannels.keys().next().value;
      if (oldestKey !== undefined) {
        userStoppedChannels.delete(oldestKey);
      }
    }
    stopped = new Set<string>();
    userStoppedChannels.set(userId, stopped);
  }
  stopped.add(channelId);
}

export function clearStoppedChannelForUser(userId: string, channelId: string): void {
  userStoppedChannels.get(userId)?.delete(channelId);
}

function setTrackedUnreadMessage(threadId: string, messageId: string): void {
  if (!lastUnreadMessagePerThread.has(threadId) && lastUnreadMessagePerThread.size >= MAX_UNREAD_THREADS) {
    const oldestKey = lastUnreadMessagePerThread.keys().next().value;
    if (oldestKey !== undefined) {
      lastUnreadMessagePerThread.delete(oldestKey);
    }
  }
  lastUnreadMessagePerThread.set(threadId, messageId);
}

export async function deliverChannelCatchupToThread(
  client: Client,
  threadId: string,
  discordId: string,
  channelId?: string
): Promise<number> {
  const thread = (await client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
  if (!thread || !thread.isThread()) return 0;

  const prefs = dbService.getUserPreferences(discordId);

  const channelIdsToProcess: string[] = [];
  if (channelId && channelId !== 'all') {
    channelIdsToProcess.push(channelId);
  } else if (thread.guild) {
    const member =
      thread.guild.members.cache.get(discordId) ||
      (await thread.guild.members.fetch(discordId).catch(() => null));
    if (member) {
      const visibleChannels = thread.guild.channels.cache.filter((c) => {
        if (c.type !== ChannelType.GuildText) return false;
        const perms = c.permissionsFor(member);
        return perms ? perms.has('ViewChannel') && perms.has('ReadMessageHistory') : false;
      });
      for (const [cId] of visibleChannels) {
        channelIdsToProcess.push(cId);
      }
    }
  }

  let totalDelivered = 0;

  for (const cId of channelIdsToProcess) {
    const totalUnreads = dbService.getUnreadCountForChannel(discordId, cId);
    const unreadItems = dbService.getUnreadMessagesForChannel(discordId, cId, 50);
    if (unreadItems.length === 0) {
      dbService.updateUserChannelRead(discordId, cId);
      continue;
    }

    const validItems: BatchedMessageItem[] = [];

    for (const item of unreadItems) {
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
        console.error('On-demand translation error:', err);
      }
    }

    dbService.updateUserChannelRead(discordId, cId);

    if (validItems.length === 0) continue;

    const channelName = unreadItems[0].channel_name;
    const latestUrl = unreadItems[unreadItems.length - 1].url;
    const oldestDeliveredTimestamp = unreadItems[0].created_at;
    const remainingUnreads = Math.max(0, totalUnreads - validItems.length);

    const countNote =
      remainingUnreads > 0
        ? `${validItems.length} of ${totalUnreads} unread messages`
        : `${validItems.length} caught-up message${validItems.length > 1 ? 's' : ''}`;

    await thread
      .send(`› Focus switched to **#${channelName}** (${countNote})`)
      .catch(() => {});

    const chunkSize = 8;

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
      if (isLastChunk && remainingUnreads > 0) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`livethread_load_more:${cId}:${oldestDeliveredTimestamp}`)
            .setLabel(`Load More (${remainingUnreads})`)
            .setStyle(ButtonStyle.Primary)
        );
      }
      const isMuted = dbService.isChannelMuted(discordId, cId);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            isMuted
              ? `livethread_unmute:${cId}`
              : `livethread_mute:${cId}`
          )
          .setLabel(
            isMuted
              ? `Unmute #${channelName}`
              : `Mute #${channelName}`
          )
          .setStyle(isMuted ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Jump to Message')
          .setStyle(ButtonStyle.Link)
          .setURL(latestUrl)
      );

      await thread.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    totalDelivered += validItems.length;
  }

  return totalDelivered;
}

export const deliverBufferedMessagesToThread = deliverChannelCatchupToThread;

export async function clearThreadActivityHints(
  thread: ThreadChannel,
  additionalMessageId?: string
): Promise<void> {
  const existingMsgId = lastUnreadMessagePerThread.get(thread.id);
  if (existingMsgId) {
    const existingMsg = await thread.messages.fetch(existingMsgId).catch(() => null);
    if (existingMsg) await existingMsg.delete().catch(() => {});
    lastUnreadMessagePerThread.delete(thread.id);
  }

  if (additionalMessageId && additionalMessageId !== existingMsgId) {
    const addMsg = await thread.messages.fetch(additionalMessageId).catch(() => null);
    if (addMsg) await addMsg.delete().catch(() => {});
  }

  try {
    const recentMessages = await thread.messages.fetch({ limit: 20 }).catch(() => null);
    if (recentMessages) {
      for (const [, msg] of recentMessages) {
        const isActivityHint =
          msg.embeds.some((e) => e.description?.startsWith('• Activity in other channels')) ||
          msg.components.some(
            (row) =>
              'components' in row &&
              row.components.some(
                (c) =>
                  'customId' in c &&
                  (c.customId?.startsWith('livethread_focus_') ||
                    c.customId?.startsWith('livethread_catchup_'))
              )
          );
        if (isActivityHint) {
          await msg.delete().catch(() => {});
        }
      }
    }
  } catch {}
}

export async function notifyThreadUnreadActivity(
  client: Client,
  threadId: string,
  discordId: string,
  guild?: Guild | null
): Promise<void> {
  const thread = (await client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
  if (!thread || !thread.isThread()) return;

  const targetGuild = guild || thread.guild;
  if (!targetGuild) return;

  const member =
    targetGuild.members.cache.get(discordId) ||
    (await targetGuild.members.fetch(discordId).catch(() => null));
  if (!member) return;

  const currentFocus = dbService.getThreadFocus(threadId);

  const visibleChannelIds = targetGuild.channels.cache
    .filter((c) => {
      if (c.type !== ChannelType.GuildText) return false;
      if (c.id === currentFocus) return false;
      const perms = c.permissionsFor(member);
      return perms ? perms.has('ViewChannel') && perms.has('ReadMessageHistory') : false;
    })
    .map((c) => c.id);

  const counts = dbService.getUserUnreadCounts(discordId, visibleChannelIds);

  await clearThreadActivityHints(thread);

  if (counts.size === 0) {
    return;
  }

  const row = new ActionRowBuilder<ButtonBuilder>();
  let totalUnread = 0;
  let buttonsAdded = 0;

  for (const [channelId, info] of counts.entries()) {
    totalUnread += info.count;
    if (buttonsAdded < 4) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`livethread_focus_btn:${channelId}`)
          .setLabel(`Focus #${info.channelName} (${info.count})`)
          .setStyle(ButtonStyle.Secondary)
      );
      buttonsAdded++;
    }
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`livethread_focus_all:${threadId}`)
      .setLabel(`Focus All (${totalUnread})`)
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setDescription(`• Activity in other channels (${totalUnread} new message${totalUnread > 1 ? 's' : ''} waiting)`);

  const newMsg = await thread.send({ embeds: [embed], components: [row] }).catch(() => null);
  if (newMsg) {
    setTrackedUnreadMessage(threadId, newMsg.id);
  }
}

export async function resolveTargetTextChannelForUser(
  client: Client,
  userId: string,
  guildId?: string | null
): Promise<TextChannel | null> {
  if (guildId) {
    const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
    if (guild) {
      const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      if (me) {
        const ch = guild.channels.cache.find((c) => {
          if (c.type !== ChannelType.GuildText) return false;
          const perms = c.permissionsFor(me);
          return perms ? perms.has('CreatePrivateThreads') : false;
        }) as TextChannel | undefined;
        if (ch) return ch;
      }
    }
  }

  for (const guild of client.guilds.cache.values()) {
    const isMember =
      guild.members.cache.has(userId) ||
      (await guild.members.fetch(userId).catch(() => null));
    if (isMember) {
      const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      if (me) {
        const textChannel = guild.channels.cache.find((c) => {
          if (c.type !== ChannelType.GuildText) return false;
          const perms = c.permissionsFor(me);
          return perms ? perms.has('CreatePrivateThreads') : false;
        }) as TextChannel | undefined;
        if (textChannel) return textChannel;
      }
    }
  }
  return null;
}
