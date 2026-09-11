import {
  Client,
  ThreadChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { translationService } from './translator';
import { createBatchedChannelEmbed, BatchedMessageItem } from '../utils/embeds';
import { dbService } from '../db/database';

interface QueuedMessage {
  id: string;
  content: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  url: string;
}

interface ChannelBatch {
  threadId: string;
  threadUserId?: string;
  channelId: string;
  channelName: string;
  targetLanguage: string;
  showOriginal: boolean;
  messages: QueuedMessage[];
  timer: NodeJS.Timeout;
}

const activeBatches = new Map<string, ChannelBatch>();
const BATCH_WINDOW_MS = 3500;
const MAX_BATCH_SIZE = 8;

export function enqueueThreadMessage(params: {
  threadId: string;
  threadUserId?: string;
  channelId: string;
  channelName: string;
  targetLanguage: string;
  showOriginal: boolean;
  message: {
    id: string;
    content: string;
    authorId?: string;
    authorName: string;
    authorAvatar?: string;
    url: string;
  };
  client: Client;
}): void {
  const {
    threadId,
    threadUserId,
    channelId,
    channelName,
    targetLanguage,
    showOriginal,
    message,
    client,
  } = params;
  const key = `${threadId}:${channelId}`;

  const existing = activeBatches.get(key);
  if (existing) {
    existing.messages.push(message);
    if (existing.messages.length >= MAX_BATCH_SIZE) {
      clearTimeout(existing.timer);
      void flushBatch(key, client);
    }
    return;
  }

  const timer = setTimeout(() => {
    void flushBatch(key, client);
  }, BATCH_WINDOW_MS);

  activeBatches.set(key, {
    threadId,
    threadUserId,
    channelId,
    channelName,
    targetLanguage,
    showOriginal,
    messages: [message],
    timer,
  });
}

async function flushBatch(key: string, client: Client): Promise<void> {
  const batch = activeBatches.get(key);
  if (!batch) return;
  activeBatches.delete(key);

  try {
    const validItems: BatchedMessageItem[] = [];
    for (const msg of batch.messages) {
      try {
        const translated = await translationService.translateWithGoogle(
          msg.content,
          batch.targetLanguage
        );
        if (translated.trim().toLowerCase() === msg.content.trim().toLowerCase()) {
          continue;
        }
        validItems.push({
          authorName: msg.authorName,
          authorAvatar: msg.authorAvatar,
          translatedText: translated,
          originalText: msg.content,
        });
      } catch (err) {
        console.error('Batch translation error for message:', err);
      }
    }
    if (validItems.length === 0) return;

    const embed = createBatchedChannelEmbed({
      channelName: batch.channelName,
      targetLanguage: batch.targetLanguage,
      items: validItems,
      showOriginal: batch.showOriginal,
    });

    const latestUrl = batch.messages[batch.messages.length - 1].url;
    const isMuted = batch.threadUserId ? dbService.isChannelMuted(batch.threadUserId, batch.channelId) : false;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          isMuted
            ? `livethread_unmute:${batch.channelId}`
            : `livethread_mute:${batch.channelId}`
        )
        .setLabel(
          isMuted
            ? `Unmute #${batch.channelName}`
            : `Mute #${batch.channelName}`
        )
        .setStyle(isMuted ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel('Jump to Message ↗')
        .setStyle(ButtonStyle.Link)
        .setURL(latestUrl)
    );

    const channel = (await client.channels.fetch(batch.threadId).catch(() => null)) as
      | ThreadChannel
      | null;
    if (!channel || !channel.isThread()) {
      dbService.removeLiveThread(batch.threadId);
      return;
    }

    if (channel.archived) {
      await channel.setArchived(false).catch(() => {});
    }

    if (channel.locked) {
      await channel.setLocked(false).catch(() => {});
    }

    await channel.send({ embeds: [embed], components: [row] }).catch((err) => {
      console.warn('Failed to send batched message to thread:', err);
    });
  } catch (error) {
    console.error('Error in flushBatch:', error);
  }
}

export async function flushAllBatches(client: Client): Promise<void> {
  const keys = Array.from(activeBatches.keys());
  for (const key of keys) {
    const batch = activeBatches.get(key);
    if (batch) {
      clearTimeout(batch.timer);
      await flushBatch(key, client);
    }
  }
}
