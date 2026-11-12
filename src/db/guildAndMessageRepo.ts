import {
  encryptField,
  decryptField,
  encryptForUser,
  decryptForUser,
  encryptForChannel,
  decryptForChannel,
} from '../utils/crypto';
import {
  sqliteDb,
  guildCache,
  mutedChannelsCache,
  threadFocusCache,
  userChannelReadsCache,
  uiBundleMemoryCache,
  mongoState,
} from './dbCore';
import {
  PermissionScope,
  GuildSettings,
  BufferedMessageItem,
  ChannelMessageItem,
} from './dbTypes';

export const guildAndMessageRepo = {
  getGuildSettings(guildId: string): GuildSettings {
    const cached = guildCache.get(guildId);
    if (cached) return cached;

    try {
      const row = sqliteDb
        .prepare('SELECT * FROM guild_settings WHERE guild_id = ?')
        .get(guildId) as Record<string, string> | undefined;

      if (row) {
        const rawThreads = decryptField(row.allow_live_threads);
        const rawPublic = decryptField(row.allow_public_translations);
        const settings: GuildSettings = {
          guild_id: guildId,
          allow_live_threads:
            rawThreads === 'everyone' || rawThreads === 'disabled' ? rawThreads : 'admin_only',
          allow_public_translations:
            rawPublic === 'everyone' || rawPublic === 'disabled' ? rawPublic : 'admin_only',
          flag_channel_reply_allowed: decryptField(row.flag_channel_reply_allowed) !== '0',
          default_mode: decryptField(row.default_mode) === 'dm' ? 'dm' : 'ephemeral',
          broadcast_completed: decryptField(row.broadcast_completed) === '1',
        };
        guildCache.set(guildId, settings);
        return settings;
      }
    } catch (err) {
      console.error('Error fetching guild settings from SQLite:', err);
    }

    const defaultSettings: GuildSettings = {
      guild_id: guildId,
      allow_live_threads: 'everyone',
      allow_public_translations: 'everyone',
      flag_channel_reply_allowed: true,
      default_mode: 'ephemeral',
      broadcast_completed: false,
    };
    guildCache.set(guildId, defaultSettings);
    return defaultSettings;
  },

  async saveGuildSettings(settings: GuildSettings): Promise<void> {
    guildCache.set(settings.guild_id, settings);

    const encThreads = encryptField(settings.allow_live_threads);
    const encPublic = encryptField(settings.allow_public_translations);
    const encFlags = encryptField(settings.flag_channel_reply_allowed ? '1' : '0');
    const encMode = encryptField(settings.default_mode);
    const encBroadcast = encryptField(settings.broadcast_completed ? '1' : '0');

    try {
      sqliteDb
        .prepare(`
          INSERT INTO guild_settings (guild_id, allow_live_threads, allow_public_translations, flag_channel_reply_allowed, default_mode, broadcast_completed)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET
            allow_live_threads = excluded.allow_live_threads,
            allow_public_translations = excluded.allow_public_translations,
            flag_channel_reply_allowed = excluded.flag_channel_reply_allowed,
            default_mode = excluded.default_mode,
            broadcast_completed = excluded.broadcast_completed
        `)
        .run(settings.guild_id, encThreads, encPublic, encFlags, encMode, encBroadcast);
    } catch (sqliteErr) {
      console.error('Failed to save guild settings to SQLite:', sqliteErr);
    }

    if (mongoState.guildsCol) {
      try {
        await mongoState.guildsCol.updateOne(
          { guild_id: settings.guild_id },
          {
            $set: {
              guild_id: settings.guild_id,
              allow_live_threads: encThreads,
              allow_public_translations: encPublic,
              flag_channel_reply_allowed: encFlags,
              default_mode: encMode,
              broadcast_completed: encBroadcast,
              updated_at: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (mongoErr) {
        console.error('Failed to save guild settings to MongoDB:', mongoErr);
      }
    }
  },

  isGuildBroadcastDone(guildId: string): boolean {
    const settings = guildAndMessageRepo.getGuildSettings(guildId);
    return Boolean(settings.broadcast_completed);
  },

  async setGuildBroadcastDone(guildId: string, done: boolean): Promise<void> {
    const settings = guildAndMessageRepo.getGuildSettings(guildId);
    settings.broadcast_completed = done;
    await guildAndMessageRepo.saveGuildSettings(settings);
  },

  async setGuildLiveThreads(guildId: string, scope: PermissionScope): Promise<void> {
    const settings = guildAndMessageRepo.getGuildSettings(guildId);
    settings.allow_live_threads = scope;
    await guildAndMessageRepo.saveGuildSettings(settings);
  },

  async setGuildPublicTranslations(guildId: string, scope: PermissionScope): Promise<void> {
    const settings = guildAndMessageRepo.getGuildSettings(guildId);
    settings.allow_public_translations = scope;
    await guildAndMessageRepo.saveGuildSettings(settings);
  },

  async setGuildFlagChannelReply(guildId: string, allowed: boolean): Promise<void> {
    const settings = guildAndMessageRepo.getGuildSettings(guildId);
    settings.flag_channel_reply_allowed = allowed;
    await guildAndMessageRepo.saveGuildSettings(settings);
  },

  getUIBundle(bundleKey: string): Record<string, string> | null {
    const cached = uiBundleMemoryCache.get(bundleKey);
    if (cached) return cached;

    try {
      const row = sqliteDb
        .prepare('SELECT data FROM ui_bundles WHERE bundle_key = ?')
        .get(bundleKey) as { data: string } | undefined;
      if (row?.data) {
        const parsed = JSON.parse(row.data) as Record<string, string>;
        uiBundleMemoryCache.set(bundleKey, parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error reading ui_bundle from SQLite:', err);
    }
    return null;
  },

  async saveUIBundle(
    bundleKey: string,
    lang: string,
    data: Record<string, string>
  ): Promise<void> {
    uiBundleMemoryCache.set(bundleKey, data);
    const dataStr = JSON.stringify(data);
    const now = Date.now();

    try {
      sqliteDb
        .prepare(
          'INSERT INTO ui_bundles (bundle_key, lang, data, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(bundle_key) DO UPDATE SET data = excluded.data'
        )
        .run(bundleKey, lang, dataStr, now);
    } catch (err) {
      console.error('Error saving ui_bundle to SQLite:', err);
    }

    if (mongoState.uiBundlesCol) {
      try {
        await mongoState.uiBundlesCol.updateOne(
          { bundle_key: bundleKey },
          { $set: { bundle_key: bundleKey, lang, data: dataStr, created_at: now } },
          { upsert: true }
        );
      } catch (mongoErr) {
        console.error('Error saving ui_bundle to MongoDB:', mongoErr);
      }
    }
  },

  isChannelMuted(discordId: string, channelId: string): boolean {
    return mutedChannelsCache.has(`${discordId}:${channelId}`);
  },

  async muteChannel(discordId: string, channelId: string, guildId: string): Promise<void> {
    const key = `${discordId}:${channelId}`;
    mutedChannelsCache.add(key);
    const now = new Date().toISOString();
    try {
      sqliteDb
        .prepare(
          'INSERT INTO user_muted_channels (discord_id, channel_id, guild_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(discord_id, channel_id) DO NOTHING'
        )
        .run(discordId, channelId, guildId, now);
    } catch (err) {
      console.error('Error muting channel in SQLite:', err);
    }

    if (mongoState.userMutedChannelsCol) {
      mongoState.userMutedChannelsCol
        .updateOne(
          { discord_id: discordId, channel_id: channelId },
          {
            $set: {
              discord_id: discordId,
              channel_id: channelId,
              guild_id: guildId,
              created_at: now,
            },
          },
          { upsert: true }
        )
        .catch((err) => console.error('Error syncing muted channel to MongoDB:', err));
    }
  },

  async unmuteChannel(discordId: string, channelId: string): Promise<void> {
    const key = `${discordId}:${channelId}`;
    mutedChannelsCache.delete(key);
    try {
      sqliteDb
        .prepare('DELETE FROM user_muted_channels WHERE discord_id = ? AND channel_id = ?')
        .run(discordId, channelId);
    } catch (err) {
      console.error('Error unmuting channel in SQLite:', err);
    }

    if (mongoState.userMutedChannelsCol) {
      mongoState.userMutedChannelsCol
        .deleteOne({ discord_id: discordId, channel_id: channelId })
        .catch((err) => console.error('Error unmuting channel in MongoDB:', err));
    }
  },

  getMutedChannels(discordId: string, guildId?: string): string[] {
    try {
      if (guildId) {
        const rows = sqliteDb
          .prepare('SELECT channel_id FROM user_muted_channels WHERE discord_id = ? AND guild_id = ?')
          .all(discordId, guildId) as { channel_id: string }[];
        return rows.map((r) => r.channel_id);
      }
      const rows = sqliteDb
        .prepare('SELECT channel_id FROM user_muted_channels WHERE discord_id = ?')
        .all(discordId) as { channel_id: string }[];
      return rows.map((r) => r.channel_id);
    } catch (err) {
      console.error('Error getting muted channels:', err);
      return [];
    }
  },

  getThreadFocus(threadId: string): string {
    return threadFocusCache.get(threadId) || 'all';
  },

  setThreadFocus(threadId: string, channelId: string): void {
    threadFocusCache.set(threadId, channelId);
    try {
      sqliteDb
        .prepare(
          'INSERT INTO thread_focus (thread_id, channel_id) VALUES (?, ?) ON CONFLICT(thread_id) DO UPDATE SET channel_id = excluded.channel_id'
        )
        .run(threadId, channelId);
    } catch (err) {
      console.error('Error setting thread focus in SQLite:', err);
    }

    if (mongoState.threadFocusCol) {
      mongoState.threadFocusCol
        .updateOne(
          { thread_id: threadId },
          { $set: { thread_id: threadId, channel_id: channelId } },
          { upsert: true }
        )
        .catch((err) => {
          console.error('Error syncing thread focus to MongoDB:', err);
        });
    }
  },

  deleteThreadFocus(threadId: string): void {
    threadFocusCache.delete(threadId);
    try {
      sqliteDb.prepare('DELETE FROM thread_focus WHERE thread_id = ?').run(threadId);
    } catch (err) {
      console.error('Error deleting thread focus in SQLite:', err);
    }

    if (mongoState.threadFocusCol) {
      mongoState.threadFocusCol.deleteOne({ thread_id: threadId }).catch((err) => {
        console.error('Error deleting thread focus from MongoDB:', err);
      });
    }
  },

  saveBufferedMessage(item: {
    discord_id: string;
    channel_id: string;
    channel_name: string;
    author_name: string;
    author_avatar?: string;
    original_text: string;
    translated_text?: string;
    url: string;
  }): void {
    const id = `${item.channel_id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const encOriginal = encryptForUser(item.original_text, item.discord_id);
    const encTranslated = item.translated_text
      ? encryptForUser(item.translated_text, item.discord_id)
      : '';
    const now = Math.floor(Date.now() / 1000);

    try {
      sqliteDb
        .prepare(`
          INSERT INTO buffered_messages (id, discord_id, channel_id, channel_name, author_name, author_avatar, original_text, translated_text, url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          item.discord_id,
          item.channel_id,
          item.channel_name,
          item.author_name,
          item.author_avatar || '',
          encOriginal,
          encTranslated,
          item.url,
          now
        );
    } catch (e) {
      console.error('Error saving buffered message to SQLite:', e);
    }

    if (mongoState.bufferedMessagesCol) {
      mongoState.bufferedMessagesCol
        .insertOne({
          id,
          discord_id: item.discord_id,
          channel_id: item.channel_id,
          channel_name: item.channel_name,
          author_name: item.author_name,
          author_avatar: item.author_avatar,
          original_text: encOriginal,
          translated_text: encTranslated,
          url: item.url,
          created_at: now,
        })
        .catch((err) => {
          console.error('Error syncing buffered message to MongoDB:', err);
        });
    }
  },

  getBufferedMessages(discordId: string, channelId?: string): BufferedMessageItem[] {
    try {
      const rows = (
        channelId
          ? sqliteDb
              .prepare('SELECT * FROM buffered_messages WHERE discord_id = ? AND channel_id = ? ORDER BY created_at ASC')
              .all(discordId, channelId)
          : sqliteDb
              .prepare('SELECT * FROM buffered_messages WHERE discord_id = ? ORDER BY created_at ASC')
              .all(discordId)
      ) as Record<string, unknown>[];

      return rows.map((r) => ({
        id: String(r.id),
        channel_id: String(r.channel_id),
        channel_name: String(r.channel_name),
        author_name: String(r.author_name),
        author_avatar: r.author_avatar ? String(r.author_avatar) : undefined,
        original_text: decryptForUser(String(r.original_text), discordId),
        translated_text: decryptForUser(String(r.translated_text), discordId),
        url: String(r.url),
        created_at: Number(r.created_at),
      }));
    } catch (e) {
      console.error('Error reading buffered messages:', e);
      return [];
    }
  },

  getBufferedCountsByUser(discordId: string): Map<string, { channelName: string; count: number }> {
    const result = new Map<string, { channelName: string; count: number }>();
    try {
      const rows = sqliteDb
        .prepare('SELECT channel_id, channel_name, COUNT(*) as cnt FROM buffered_messages WHERE discord_id = ? GROUP BY channel_id, channel_name')
        .all(discordId) as { channel_id: string; channel_name: string; cnt: number }[];
      for (const r of rows) {
        result.set(r.channel_id, { channelName: r.channel_name, count: r.cnt });
      }
    } catch (e) {
      console.error('Error counting buffered messages:', e);
    }
    return result;
  },

  clearBufferedMessages(discordId: string, channelId?: string): void {
    try {
      if (channelId) {
        sqliteDb
          .prepare('DELETE FROM buffered_messages WHERE discord_id = ? AND channel_id = ?')
          .run(discordId, channelId);
      } else {
        sqliteDb
          .prepare('DELETE FROM buffered_messages WHERE discord_id = ?')
          .run(discordId);
      }
    } catch (e) {
      console.error('Error clearing buffered messages in SQLite:', e);
    }

    if (mongoState.bufferedMessagesCol) {
      const filter = channelId
        ? { discord_id: discordId, channel_id: channelId }
        : { discord_id: discordId };
      mongoState.bufferedMessagesCol.deleteMany(filter).catch((err) => {
        console.error('Error clearing buffered messages in MongoDB:', err);
      });
    }
  },

  saveChannelMessage(item: {
    id: string;
    guild_id: string;
    channel_id: string;
    channel_name: string;
    author_name: string;
    author_avatar?: string;
    original_text: string;
    url: string;
    created_at?: number;
  }): void {
    const encText = encryptForChannel(item.original_text, item.channel_id);
    const now = item.created_at || Math.floor(Date.now() / 1000);

    try {
      sqliteDb
        .prepare(`
          INSERT INTO channel_buffered_messages (id, guild_id, channel_id, channel_name, author_name, author_avatar, encrypted_text, url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            guild_id = excluded.guild_id,
            channel_id = excluded.channel_id,
            channel_name = excluded.channel_name,
            author_name = excluded.author_name,
            author_avatar = excluded.author_avatar,
            encrypted_text = excluded.encrypted_text,
            url = excluded.url,
            created_at = excluded.created_at
        `)
        .run(
          item.id,
          item.guild_id,
          item.channel_id,
          item.channel_name,
          item.author_name,
          item.author_avatar || '',
          encText,
          item.url,
          now
        );

      sqliteDb
        .prepare('DELETE FROM channel_buffered_messages WHERE created_at < ?')
        .run(Math.floor(Date.now() / 1000) - 604800);
    } catch (e) {
      console.error('Error saving channel message to SQLite:', e);
    }

    if (mongoState.channelBufferedMessagesCol) {
      mongoState.channelBufferedMessagesCol
        .updateOne(
          { id: item.id },
          {
            $set: {
              id: item.id,
              guild_id: item.guild_id,
              channel_id: item.channel_id,
              channel_name: item.channel_name,
              author_name: item.author_name,
              author_avatar: item.author_avatar,
              encrypted_text: encText,
              url: item.url,
              created_at: new Date(now * 1000),
            },
          },
          { upsert: true }
        )
        .catch((err) => {
          console.error('Error syncing channel message to MongoDB:', err);
        });
    }
  },

  updateUserChannelRead(discordId: string, channelId: string, timestamp?: number): void {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    userChannelReadsCache.set(`${discordId}:${channelId}`, ts);

    try {
      sqliteDb
        .prepare(`
          INSERT INTO user_channel_reads (discord_id, channel_id, last_read_at)
          VALUES (?, ?, ?)
          ON CONFLICT(discord_id, channel_id) DO UPDATE SET last_read_at = excluded.last_read_at
        `)
        .run(discordId, channelId, ts);
    } catch (e) {
      console.error('Error updating user channel read in SQLite:', e);
    }

    if (mongoState.userChannelReadsCol) {
      mongoState.userChannelReadsCol
        .updateOne(
          { discord_id: discordId, channel_id: channelId },
          { $set: { discord_id: discordId, channel_id: channelId, last_read_at: ts } },
          { upsert: true }
        )
        .catch((err) => {
          console.error('Error syncing user channel read to MongoDB:', err);
        });
    }
  },

  getUserChannelRead(discordId: string, channelId: string): number {
    const cached = userChannelReadsCache.get(`${discordId}:${channelId}`);
    if (cached !== undefined) return cached;

    try {
      const row = sqliteDb
        .prepare('SELECT last_read_at FROM user_channel_reads WHERE discord_id = ? AND channel_id = ?')
        .get(discordId, channelId) as { last_read_at: number } | undefined;
      const ts = row ? row.last_read_at : 0;
      userChannelReadsCache.set(`${discordId}:${channelId}`, ts);
      return ts;
    } catch {
      return 0;
    }
  },

  getUnreadCountForChannel(discordId: string, channelId: string): number {
    const lastRead = guildAndMessageRepo.getUserChannelRead(discordId, channelId);
    try {
      const row = sqliteDb
        .prepare(`
          SELECT COUNT(*) as cnt
          FROM channel_buffered_messages
          WHERE channel_id = ? AND created_at > ?
        `)
        .get(channelId, lastRead) as { cnt: number } | undefined;
      return row ? row.cnt : 0;
    } catch {
      return 0;
    }
  },

  getUnreadMessagesForChannel(discordId: string, channelId: string, limit: number = 50): ChannelMessageItem[] {
    const lastRead = guildAndMessageRepo.getUserChannelRead(discordId, channelId);
    try {
      const rows = sqliteDb
        .prepare(`
          SELECT * FROM (
            SELECT * FROM channel_buffered_messages
            WHERE channel_id = ? AND created_at > ?
            ORDER BY created_at DESC
            LIMIT ?
          )
          ORDER BY created_at ASC
        `)
        .all(channelId, lastRead, limit) as Record<string, unknown>[];

      return rows.map((r) => ({
        id: String(r.id),
        guild_id: String(r.guild_id),
        channel_id: String(r.channel_id),
        channel_name: String(r.channel_name),
        author_name: String(r.author_name),
        author_avatar: r.author_avatar ? String(r.author_avatar) : undefined,
        original_text: decryptForChannel(String(r.encrypted_text), channelId),
        url: String(r.url),
        created_at: Number(r.created_at),
      }));
    } catch (e) {
      console.error('Error reading unread channel messages:', e);
      return [];
    }
  },

  getOlderMessagesCount(channelId: string, beforeTimestamp: number): number {
    try {
      const row = sqliteDb
        .prepare(`
          SELECT COUNT(*) as cnt
          FROM channel_buffered_messages
          WHERE channel_id = ? AND created_at < ?
        `)
        .get(channelId, beforeTimestamp) as { cnt: number } | undefined;
      return row ? row.cnt : 0;
    } catch {
      return 0;
    }
  },

  getOlderMessagesForChannel(channelId: string, beforeTimestamp: number, limit: number = 50): ChannelMessageItem[] {
    try {
      const rows = sqliteDb
        .prepare(`
          SELECT * FROM (
            SELECT * FROM channel_buffered_messages
            WHERE channel_id = ? AND created_at < ?
            ORDER BY created_at DESC
            LIMIT ?
          )
          ORDER BY created_at ASC
        `)
        .all(channelId, beforeTimestamp, limit) as Record<string, unknown>[];

      return rows.map((r) => ({
        id: String(r.id),
        guild_id: String(r.guild_id),
        channel_id: String(r.channel_id),
        channel_name: String(r.channel_name),
        author_name: String(r.author_name),
        author_avatar: r.author_avatar ? String(r.author_avatar) : undefined,
        original_text: decryptForChannel(String(r.encrypted_text), channelId),
        url: String(r.url),
        created_at: Number(r.created_at),
      }));
    } catch (e) {
      console.error('Error reading older channel messages:', e);
      return [];
    }
  },

  getUserUnreadCounts(discordId: string, visibleChannelIds: string[]): Map<string, { channelName: string; count: number }> {
    const result = new Map<string, { channelName: string; count: number }>();
    if (visibleChannelIds.length === 0) return result;

    for (const channelId of visibleChannelIds) {
      if (guildAndMessageRepo.isChannelMuted(discordId, channelId)) continue;
      const lastRead = guildAndMessageRepo.getUserChannelRead(discordId, channelId);

      try {
        const row = sqliteDb
          .prepare(`
            SELECT channel_name, COUNT(*) as cnt
            FROM channel_buffered_messages
            WHERE channel_id = ? AND created_at > ?
          `)
          .get(channelId, lastRead) as { channel_name: string; cnt: number } | undefined;

        if (row && row.cnt > 0) {
          result.set(channelId, { channelName: row.channel_name, count: row.cnt });
        }
      } catch (e) {
        console.error('Error counting unread for channel:', e);
      }
    }
    return result;
  },
};
