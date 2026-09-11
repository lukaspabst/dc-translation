import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface ChannelTranslationRule {
  targetLanguage: string;
  engine: 'google' | 'deepl';
  showOriginal: boolean;
}

let redisClient: Redis | null = null;
let isConnected = false;

const localRulesFallback = new Map<string, Map<string, ChannelTranslationRule>>();
const localThreadsFallback = new Map<string, string>();
const localWebhooksFallback = new Map<string, string>();
const localTranslationsFallback = new Map<string, string>();
const localSubscribersFallback = new Map<string, Set<string>>();
const localGuildThreadsFallback = new Map<string, string>();

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const password = process.env.REDIS_PASSWORD || undefined;
  try {
    redisClient = new Redis(redisUrl, {
      password,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('Redis connected successfully.');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      console.warn('Redis connection issue, using memory fallback:', err.message);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    await redisClient.connect();
  } catch (err: unknown) {
    isConnected = false;
    const msg = err instanceof Error ? err.message : 'Unknown Redis init error';
    console.warn(`Could not connect to Redis (${msg}), running with memory fallbacks.`);
  }
}

export async function getChannelRules(
  channelId: string
): Promise<Record<string, ChannelTranslationRule>> {
  if (isConnected && redisClient) {
    try {
      const raw = await redisClient.hgetall(`rules:channel:${channelId}`);
      const result: Record<string, ChannelTranslationRule> = {};
      for (const [userId, ruleStr] of Object.entries(raw)) {
        try {
          result[userId] = JSON.parse(ruleStr) as ChannelTranslationRule;
        } catch {}
      }
      return result;
    } catch {
      return getLocalChannelRules(channelId);
    }
  }
  return getLocalChannelRules(channelId);
}

function getLocalChannelRules(
  channelId: string
): Record<string, ChannelTranslationRule> {
  const map = localRulesFallback.get(channelId);
  if (!map) return {};
  const result: Record<string, ChannelTranslationRule> = {};
  for (const [userId, rule] of map.entries()) {
    result[userId] = rule;
  }
  return result;
}

export async function setChannelRule(
  channelId: string,
  userId: string,
  rule: ChannelTranslationRule
): Promise<void> {
  if (!localRulesFallback.has(channelId)) {
    localRulesFallback.set(channelId, new Map());
  }
  localRulesFallback.get(channelId)?.set(userId, rule);

  if (isConnected && redisClient) {
    try {
      await redisClient.hset(
        `rules:channel:${channelId}`,
        userId,
        JSON.stringify(rule)
      );
    } catch (err) {
      console.warn('Failed to set channel rule in Redis:', err);
    }
  }
}

export async function removeChannelRule(
  channelId: string,
  userId: string
): Promise<void> {
  localRulesFallback.get(channelId)?.delete(userId);

  if (isConnected && redisClient) {
    try {
      await redisClient.hdel(`rules:channel:${channelId}`, userId);
    } catch (err) {
      console.warn('Failed to remove channel rule in Redis:', err);
    }
  }
}

export async function getCachedThread(
  channelId: string,
  userId: string
): Promise<string | null> {
  const key = `${channelId}:${userId}`;
  if (isConnected && redisClient) {
    try {
      return await redisClient.get(`threads:${key}`);
    } catch {
      return localThreadsFallback.get(key) || null;
    }
  }
  return localThreadsFallback.get(key) || null;
}

export async function setCachedThread(
  channelId: string,
  userId: string,
  threadId: string,
  ttlSeconds = 86400
): Promise<void> {
  const key = `${channelId}:${userId}`;
  localThreadsFallback.set(key, threadId);

  if (isConnected && redisClient) {
    try {
      await redisClient.set(`threads:${key}`, threadId, 'EX', ttlSeconds);
    } catch (err) {
      console.warn('Failed to set cached thread in Redis:', err);
    }
  }
}

export async function removeCachedThread(
  channelId: string,
  userId: string
): Promise<void> {
  const key = `${channelId}:${userId}`;
  localThreadsFallback.delete(key);

  if (isConnected && redisClient) {
    try {
      await redisClient.del(`threads:${key}`);
    } catch (err) {
      console.warn('Failed to remove cached thread in Redis:', err);
    }
  }
}

export async function getCachedWebhook(channelId: string): Promise<string | null> {
  if (isConnected && redisClient) {
    try {
      return await redisClient.get(`webhooks:${channelId}`);
    } catch {
      return localWebhooksFallback.get(channelId) || null;
    }
  }
  return localWebhooksFallback.get(channelId) || null;
}

export async function setCachedWebhook(
  channelId: string,
  webhookUrl: string,
  ttlSeconds = 604800
): Promise<void> {
  localWebhooksFallback.set(channelId, webhookUrl);

  if (isConnected && redisClient) {
    try {
      await redisClient.set(`webhooks:${channelId}`, webhookUrl, 'EX', ttlSeconds);
    } catch (err) {
      console.warn('Failed to set cached webhook in Redis:', err);
    }
  }
}

export async function invalidateCachedWebhook(channelId: string): Promise<void> {
  localWebhooksFallback.delete(channelId);

  if (isConnected && redisClient) {
    try {
      await redisClient.del(`webhooks:${channelId}`);
    } catch (err) {
      console.warn('Failed to invalidate webhook in Redis:', err);
    }
  }
}

function getTranslationCacheHash(text: string, targetLang: string): string {
  return crypto.createHash('sha256').update(`${targetLang}:${text}`).digest('hex');
}

export async function getCachedTranslation(
  text: string,
  targetLang: string
): Promise<string | null> {
  const hash = getTranslationCacheHash(text, targetLang);
  if (isConnected && redisClient) {
    try {
      return await redisClient.get(`cache:trans:${hash}`);
    } catch {
      return localTranslationsFallback.get(hash) || null;
    }
  }
  return localTranslationsFallback.get(hash) || null;
}

export async function setCachedTranslation(
  text: string,
  targetLang: string,
  translatedText: string,
  ttlSeconds = 1209600
): Promise<void> {
  const hash = getTranslationCacheHash(text, targetLang);
  localTranslationsFallback.set(hash, translatedText);

  if (isConnected && redisClient) {
    try {
      await redisClient.set(`cache:trans:${hash}`, translatedText, 'EX', ttlSeconds);
    } catch (err) {
      console.warn('Failed to set cached translation in Redis:', err);
    }
  }
}

export async function getGuildSubscribers(guildId: string): Promise<string[]> {
  if (isConnected && redisClient) {
    try {
      return await redisClient.smembers(`guild_subscribers:${guildId}`);
    } catch {
      return Array.from(localSubscribersFallback.get(guildId) || []);
    }
  }
  return Array.from(localSubscribersFallback.get(guildId) || []);
}

export async function addGuildSubscriber(
  guildId: string,
  userId: string
): Promise<void> {
  if (!localSubscribersFallback.has(guildId)) {
    localSubscribersFallback.set(guildId, new Set());
  }
  localSubscribersFallback.get(guildId)?.add(userId);

  if (isConnected && redisClient) {
    try {
      await redisClient.sadd(`guild_subscribers:${guildId}`, userId);
    } catch (err) {
      console.warn('Failed to add guild subscriber in Redis:', err);
    }
  }
}

export async function removeGuildSubscriber(
  guildId: string,
  userId: string
): Promise<void> {
  localSubscribersFallback.get(guildId)?.delete(userId);

  if (isConnected && redisClient) {
    try {
      await redisClient.srem(`guild_subscribers:${guildId}`, userId);
    } catch (err) {
      console.warn('Failed to remove guild subscriber in Redis:', err);
    }
  }
}

export async function getUserGuildThread(
  guildId: string,
  userId: string
): Promise<string | null> {
  const key = `${guildId}:${userId}`;
  if (isConnected && redisClient) {
    try {
      return await redisClient.get(`guild_threads:${key}`);
    } catch {
      return localGuildThreadsFallback.get(key) || null;
    }
  }
  return localGuildThreadsFallback.get(key) || null;
}

export async function setUserGuildThread(
  guildId: string,
  userId: string,
  threadId: string,
  ttlSeconds = 604800
): Promise<void> {
  const key = `${guildId}:${userId}`;
  localGuildThreadsFallback.set(key, threadId);

  if (isConnected && redisClient) {
    try {
      await redisClient.set(`guild_threads:${key}`, threadId, 'EX', ttlSeconds);
    } catch (err) {
      console.warn('Failed to set user guild thread in Redis:', err);
    }
  }
}

export async function removeUserGuildThread(
  guildId: string,
  userId: string
): Promise<void> {
  const key = `${guildId}:${userId}`;
  localGuildThreadsFallback.delete(key);

  if (isConnected && redisClient) {
    try {
      await redisClient.del(`guild_threads:${key}`);
    } catch (err) {
      console.warn('Failed to remove user guild thread in Redis:', err);
    }
  }
}
