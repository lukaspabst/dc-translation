import { TextChannel, ThreadChannel, PermissionsBitField } from 'discord.js';
import {
  getCachedWebhook,
  setCachedWebhook,
  invalidateCachedWebhook,
} from '../db/redis';

export interface WebhookSendOptions {
  thread: ThreadChannel;
  username: string;
  avatarUrl?: string;
  content: string;
  sourceChannelName?: string;
}

export async function resolveChannelWebhook(
  channel: TextChannel
): Promise<string | null> {
  const cachedUrl = await getCachedWebhook(channel.id);
  if (cachedUrl) {
    return cachedUrl;
  }

  const botMember =
    channel.guild.members.me ||
    (await channel.guild.members.fetchMe().catch(() => null));
  if (!botMember) return null;

  const perms = channel.permissionsFor(botMember);
  if (!perms || !perms.has(PermissionsBitField.Flags.ManageWebhooks)) {
    return null;
  }

  try {
    const webhooks = await channel.fetchWebhooks();
    const botId = channel.client.user?.id;
    let target = webhooks.find(
      (w) => w.owner?.id === botId || w.name === 'dc-translation-relay'
    );

    if (!target) {
      target = await channel.createWebhook({
        name: 'dc-translation-relay',
        reason: 'Automated relay for live translated threads',
      });
    }

    if (target.url) {
      await setCachedWebhook(channel.id, target.url);
      return target.url;
    }
  } catch (err) {
    console.warn(`Failed to resolve webhook for #${channel.name}:`, err);
  }

  return null;
}

export async function sendWebhookTranslation(
  options: WebhookSendOptions
): Promise<void> {
  const { thread, username, avatarUrl, content, sourceChannelName } = options;
  const parent = thread.parent;
  if (!parent || !('fetchWebhooks' in parent)) {
    return;
  }
  const parentChannel = parent as TextChannel;

  const displayContent =
    sourceChannelName && parentChannel.name !== sourceChannelName
      ? `[#${sourceChannelName}] ${content}`
      : content;

  let webhookUrl = await resolveChannelWebhook(parentChannel);

  if (webhookUrl) {
    const cleanUsername = username.trim().slice(0, 80) || 'User';
    const payload = {
      content: displayContent.slice(0, 2000),
      username: cleanUsername,
      avatar_url: avatarUrl,
      allowed_mentions: { parse: [] },
    };

    try {
      let response = await fetch(`${webhookUrl}?thread_id=${thread.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        await invalidateCachedWebhook(parentChannel.id);
        webhookUrl = await resolveChannelWebhook(parentChannel);
        if (webhookUrl) {
          response = await fetch(`${webhookUrl}?thread_id=${thread.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }

      if (response.ok) {
        return;
      }

      if (response.status === 429) {
        const data = (await response.json().catch(() => null)) as {
          retry_after?: number;
        } | null;
        console.warn(
          `Webhook rate limit hit for #${parentChannel.name}, retry_after: ${data?.retry_after}s`
        );
      }
    } catch (err) {
      console.warn(`Error executing webhook for #${parentChannel.name}:`, err);
    }
  }

  try {
    if (thread.archived) {
      await thread.setArchived(false).catch(() => {});
    }
    await thread.send({
      content: `**${username}**: ${displayContent}`.slice(0, 2000),
      allowedMentions: { parse: [] },
    });
  } catch (fallbackErr) {
    console.error(`Fallback thread delivery failed for thread ${thread.id}:`, fallbackErr);
  }
}
