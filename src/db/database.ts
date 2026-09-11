import Database from 'better-sqlite3';
import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';
import path from 'path';
import * as fs from 'fs';
import { encryptField, decryptField, encryptForUser, decryptForUser, encryptForChannel, decryptForChannel } from '../utils/crypto';
import { setMongoCacheCollection, CachedTranslationDoc } from '../services/cache';

export type SetupStatus = 'none' | 'pending' | 'completed';

export interface UserPreferences {
  discord_id: string;
  target_language: string;
  show_original: number;
  flag_duration: number;
  flag_mode: 'channel' | 'dm';
  auto_translate_dm: boolean;
  auto_translate_thread: boolean;
  preferred_engine: 'google' | 'deepl';
  setup_completed: boolean;
  setup_status: SetupStatus;
}

export interface LiveThreadRecord {
  thread_id: string;
  discord_id: string;
  guild_id?: string;
  channel_id: string;
  target_language: string;
  created_at: string;
}

export interface ChannelMessageItem {
  id: string;
  guild_id: string;
  channel_id: string;
  channel_name: string;
  author_name: string;
  author_avatar?: string;
  original_text: string;
  url: string;
  created_at: number;
}

export interface ChannelMessageRecord {
  id: string;
  guild_id: string;
  channel_id: string;
  channel_name: string;
  author_name: string;
  author_avatar?: string;
  encrypted_text: string;
  url: string;
  created_at: Date | number;
}

export interface UserChannelReadRecord {
  discord_id: string;
  channel_id: string;
  last_read_at: number;
}

export interface BufferedMessageItem {
  id: string;
  channel_id: string;
  channel_name: string;
  author_name: string;
  author_avatar?: string;
  original_text: string;
  translated_text: string;
  url: string;
  created_at: number;
}

export interface BufferedMessageRecord {
  id: string;
  discord_id: string;
  channel_id: string;
  channel_name: string;
  author_name: string;
  author_avatar?: string;
  original_text: string;
  translated_text: string;
  url: string;
  created_at: number;
}

export interface UserMutedChannelRecord {
  discord_id: string;
  channel_id: string;
  guild_id: string;
  created_at: string;
}

export type PermissionScope = 'disabled' | 'admin_only' | 'everyone';

export interface GuildSettings {
  guild_id: string;
  allow_live_threads: PermissionScope;
  allow_public_translations: PermissionScope;
  flag_channel_reply_allowed: boolean;
  default_mode: 'ephemeral' | 'dm';
  broadcast_completed?: boolean;
}

interface EncryptedUserRecord {
  discord_id: string;
  target_language: string;
  show_original: string;
  flag_duration: string;
  flag_mode: string;
  auto_translate_dm: string;
  auto_translate_thread?: string;
  preferred_engine: string;
  setup_completed: string;
  setup_status?: string;
  updated_at: Date;
}

interface EncryptedGuildRecord {
  guild_id: string;
  allow_live_threads: string;
  allow_public_translations: string;
  flag_channel_reply_allowed: string;
  default_mode: string;
  broadcast_completed?: string;
  updated_at: Date;
}

const userCache = new Map<string, UserPreferences>();
const guildCache = new Map<string, GuildSettings>();
const mutedChannelsCache = new Set<string>();
const threadFocusCache = new Map<string, string>();
const userChannelReadsCache = new Map<string, number>();

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let mongoUsersCol: Collection<EncryptedUserRecord> | null = null;
let mongoGuildsCol: Collection<EncryptedGuildRecord> | null = null;
let mongoLiveThreadsCol: Collection<LiveThreadRecord> | null = null;
let mongoUiBundlesCol: Collection<UIBundleDoc> | null = null;
let mongoUserMutedChannelsCol: Collection<UserMutedChannelRecord> | null = null;
let mongoBufferedMessagesCol: Collection<BufferedMessageRecord> | null = null;
let mongoChannelBufferedMessagesCol: Collection<ChannelMessageRecord> | null = null;
let mongoUserChannelReadsCol: Collection<UserChannelReadRecord> | null = null;
let mongoThreadFocusCol: Collection<{ thread_id: string; channel_id: string }> | null = null;

export interface UIBundleDoc {
  bundle_key: string;
  lang: string;
  data: string;
  created_at: number;
}

const dbPath = path.resolve(__dirname, '../../data.db');
const sqliteDb = new Database(dbPath);

sqliteDb.pragma('journal_mode = WAL');

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    target_language TEXT NOT NULL,
    show_original TEXT,
    flag_duration TEXT,
    flag_mode TEXT,
    auto_translate_dm TEXT,
    preferred_engine TEXT
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS user_muted_channels (
    discord_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (discord_id, channel_id)
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS thread_focus (
    thread_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL
  )
`);

try {
  const mutedRows = sqliteDb
    .prepare('SELECT discord_id, channel_id FROM user_muted_channels')
    .all() as { discord_id: string; channel_id: string }[];
  for (const r of mutedRows) {
    mutedChannelsCache.add(`${r.discord_id}:${r.channel_id}`);
  }
} catch {}

try {
  const focusRows = sqliteDb
    .prepare('SELECT thread_id, channel_id FROM thread_focus')
    .all() as { thread_id: string; channel_id: string }[];
  for (const r of focusRows) {
    threadFocusCache.set(r.thread_id, r.channel_id);
  }
} catch {}

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS live_threads (
    thread_id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
    guild_id TEXT,
    channel_id TEXT NOT NULL,
    target_language TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    allow_live_threads TEXT NOT NULL,
    allow_public_translations TEXT NOT NULL,
    flag_channel_reply_allowed TEXT NOT NULL,
    default_mode TEXT NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS ui_bundles (
    bundle_key TEXT PRIMARY KEY,
    lang TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS buffered_messages (
    id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE INDEX IF NOT EXISTS idx_buf_user_chan ON buffered_messages(discord_id, channel_id)
`);

try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN auto_translate_dm TEXT');
} catch {}

try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN auto_translate_thread TEXT');
} catch {}

try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN setup_completed TEXT');
} catch {}

try {
  sqliteDb.exec('ALTER TABLE users ADD COLUMN setup_status TEXT');
} catch {}

try {
  sqliteDb.exec('ALTER TABLE guild_settings ADD COLUMN broadcast_completed TEXT');
} catch {}

try {
  sqliteDb.exec('ALTER TABLE live_threads ADD COLUMN guild_id TEXT');
} catch {}

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS channel_buffered_messages (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    encrypted_text TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE INDEX IF NOT EXISTS idx_chan_buf_time ON channel_buffered_messages(channel_id, created_at)
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS user_channel_reads (
    discord_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    last_read_at INTEGER NOT NULL,
    PRIMARY KEY (discord_id, channel_id)
  )
`);

try {
  const readRows = sqliteDb
    .prepare('SELECT discord_id, channel_id, last_read_at FROM user_channel_reads')
    .all() as { discord_id: string; channel_id: string; last_read_at: number }[];
  for (const r of readRows) {
    userChannelReadsCache.set(`${r.discord_id}:${r.channel_id}`, r.last_read_at);
  }
} catch {}

export async function initDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.trim() !== '') {
    try {
      const options: MongoClientOptions = {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
      };

      if (process.env.MONGODB_CERT_PEM && process.env.MONGODB_CERT_PEM.trim() !== '') {
        const raw = process.env.MONGODB_CERT_PEM.trim();
        const content = raw.includes('BEGIN CERTIFICATE')
          ? raw
          : Buffer.from(raw, 'base64').toString('utf8');
        const certPath = path.resolve('/tmp/mongodb-cert.pem');
        fs.writeFileSync(certPath, content, { mode: 0o600 });
        options.tlsCertificateKeyFile = certPath;
      } else if (process.env.MONGODB_CERT_PATH && fs.existsSync(process.env.MONGODB_CERT_PATH)) {
        options.tlsCertificateKeyFile = path.resolve(process.env.MONGODB_CERT_PATH);
      }

      mongoClient = new MongoClient(mongoUri, options);
      await mongoClient.connect();
      mongoDb = mongoClient.db(process.env.MONGODB_DB_NAME || 'dc_translation');

      mongoUsersCol = mongoDb.collection<EncryptedUserRecord>('users');
      await mongoUsersCol.createIndex({ discord_id: 1 }, { unique: true });

      mongoGuildsCol = mongoDb.collection<EncryptedGuildRecord>('guild_settings');
      await mongoGuildsCol.createIndex({ guild_id: 1 }, { unique: true });

      const cacheCol = mongoDb.collection<CachedTranslationDoc>('translation_cache');
      await cacheCol.createIndex({ key: 1 }, { unique: true });
      await cacheCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });
      setMongoCacheCollection(cacheCol);

      mongoUiBundlesCol = mongoDb.collection<UIBundleDoc>('ui_bundles');
      await mongoUiBundlesCol.createIndex({ bundle_key: 1 }, { unique: true });

      mongoLiveThreadsCol = mongoDb.collection<LiveThreadRecord>('live_threads');
      await mongoLiveThreadsCol.createIndex({ thread_id: 1 }, { unique: true });
      await mongoLiveThreadsCol.createIndex({ discord_id: 1, guild_id: 1 });

      mongoUserMutedChannelsCol = mongoDb.collection<UserMutedChannelRecord>('user_muted_channels');
      await mongoUserMutedChannelsCol.createIndex({ discord_id: 1, channel_id: 1 }, { unique: true });
      await mongoUserMutedChannelsCol.createIndex({ discord_id: 1, guild_id: 1 });

      mongoBufferedMessagesCol = mongoDb.collection<BufferedMessageRecord>('buffered_messages');
      try {
        await mongoBufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
      } catch {
        try {
          await mongoBufferedMessagesCol.dropIndex('created_at_1');
          await mongoBufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
        } catch {}
      }
      await mongoBufferedMessagesCol.createIndex({ discord_id: 1, channel_id: 1 });

      mongoChannelBufferedMessagesCol = mongoDb.collection<ChannelMessageRecord>('channel_buffered_messages');
      try {
        await mongoChannelBufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
      } catch {
        try {
          await mongoChannelBufferedMessagesCol.dropIndex('created_at_1');
          await mongoChannelBufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
        } catch {}
      }
      await mongoChannelBufferedMessagesCol.createIndex({ channel_id: 1, created_at: 1 });

      mongoUserChannelReadsCol = mongoDb.collection<UserChannelReadRecord>('user_channel_reads');
      await mongoUserChannelReadsCol.createIndex({ discord_id: 1, channel_id: 1 }, { unique: true });

      mongoThreadFocusCol = mongoDb.collection<{ thread_id: string; channel_id: string }>('thread_focus');
      await mongoThreadFocusCol.createIndex({ thread_id: 1 }, { unique: true });

      try {
        const storedBundles = await mongoUiBundlesCol.find({}).toArray();
        for (const b of storedBundles) {
          try {
            sqliteDb
              .prepare(
                'INSERT INTO ui_bundles (bundle_key, lang, data, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(bundle_key) DO UPDATE SET data = excluded.data'
              )
              .run(b.bundle_key, b.lang, b.data, b.created_at);
          } catch {}
        }

        const storedThreads = await mongoLiveThreadsCol.find({}).toArray();
        for (const t of storedThreads) {
          try {
            sqliteDb
              .prepare(
                `INSERT INTO live_threads (thread_id, discord_id, guild_id, channel_id, target_language, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(thread_id) DO UPDATE SET
                   discord_id = excluded.discord_id,
                   guild_id = excluded.guild_id,
                   channel_id = excluded.channel_id,
                   target_language = excluded.target_language,
                   created_at = excluded.created_at`
              )
              .run(t.thread_id, t.discord_id, t.guild_id, t.channel_id, t.target_language, t.created_at);
          } catch {}
        }

        const storedUsers = await mongoUsersCol.find({}).toArray();
        for (const u of storedUsers) {
          try {
            const fallbackStatus = u.setup_status
              ? u.setup_status
              : u.setup_completed && decryptField(u.setup_completed) === '1'
                ? encryptField('completed')
                : encryptField('none');
            sqliteDb
              .prepare(
                `INSERT INTO users (discord_id, target_language, show_original, flag_duration, flag_mode, auto_translate_dm, auto_translate_thread, preferred_engine, setup_completed, setup_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(discord_id) DO UPDATE SET
                   target_language = excluded.target_language,
                   show_original = excluded.show_original,
                   flag_duration = excluded.flag_duration,
                   flag_mode = excluded.flag_mode,
                   auto_translate_dm = excluded.auto_translate_dm,
                   auto_translate_thread = excluded.auto_translate_thread,
                   preferred_engine = excluded.preferred_engine,
                   setup_completed = excluded.setup_completed,
                   setup_status = excluded.setup_status`
              )
              .run(
                u.discord_id,
                u.target_language,
                u.show_original,
                u.flag_duration,
                u.flag_mode,
                u.auto_translate_dm,
                u.auto_translate_thread,
                u.preferred_engine,
                u.setup_completed,
                fallbackStatus
              );
          } catch {}
        }

        const storedGuilds = await mongoGuildsCol.find({}).toArray();
        for (const g of storedGuilds) {
          try {
            sqliteDb
              .prepare(
                `INSERT INTO guild_settings (guild_id, allow_live_threads, allow_public_translations, flag_channel_reply_allowed, default_mode, broadcast_completed)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(guild_id) DO UPDATE SET
                   allow_live_threads = excluded.allow_live_threads,
                   allow_public_translations = excluded.allow_public_translations,
                   flag_channel_reply_allowed = excluded.flag_channel_reply_allowed,
                   default_mode = excluded.default_mode,
                   broadcast_completed = excluded.broadcast_completed`
              )
              .run(
                g.guild_id,
                g.allow_live_threads,
                g.allow_public_translations,
                g.flag_channel_reply_allowed,
                g.default_mode,
                g.broadcast_completed
              );
          } catch {}
        }

        const storedMuted = await mongoUserMutedChannelsCol.find({}).toArray();
        for (const m of storedMuted) {
          try {
            sqliteDb
              .prepare(
                'INSERT INTO user_muted_channels (discord_id, channel_id, guild_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(discord_id, channel_id) DO NOTHING'
              )
              .run(m.discord_id, m.channel_id, m.guild_id, m.created_at);
            mutedChannelsCache.add(`${m.discord_id}:${m.channel_id}`);
          } catch {}
        }

        if (mongoBufferedMessagesCol) {
          const storedBuffered = await mongoBufferedMessagesCol.find({}).toArray();
          for (const bm of storedBuffered) {
            try {
              sqliteDb
                .prepare(`
                  INSERT INTO buffered_messages (id, discord_id, channel_id, channel_name, author_name, author_avatar, original_text, translated_text, url, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO NOTHING
                `)
                .run(
                  bm.id,
                  bm.discord_id,
                  bm.channel_id,
                  bm.channel_name,
                  bm.author_name,
                  bm.author_avatar || '',
                  bm.original_text,
                  bm.translated_text,
                  bm.url,
                  bm.created_at
                );
            } catch {}
          }
        }

        if (mongoChannelBufferedMessagesCol) {
          const storedChanMsgs = await mongoChannelBufferedMessagesCol.find({}).toArray();
          for (const cm of storedChanMsgs) {
            try {
              const createdAtSec = cm.created_at instanceof Date
                ? Math.floor(cm.created_at.getTime() / 1000)
                : Number(cm.created_at);
              sqliteDb
                .prepare(`
                  INSERT INTO channel_buffered_messages (id, guild_id, channel_id, channel_name, author_name, author_avatar, encrypted_text, url, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO NOTHING
                `)
                .run(
                  cm.id,
                  cm.guild_id,
                  cm.channel_id,
                  cm.channel_name,
                  cm.author_name,
                  cm.author_avatar || '',
                  cm.encrypted_text,
                  cm.url,
                  createdAtSec
                );
            } catch {}
          }
          sqliteDb
            .prepare('DELETE FROM channel_buffered_messages WHERE created_at < ?')
            .run(Math.floor(Date.now() / 1000) - 604800);
        }

        if (mongoUserChannelReadsCol) {
          const storedReads = await mongoUserChannelReadsCol.find({}).toArray();
          for (const ur of storedReads) {
            try {
              userChannelReadsCache.set(`${ur.discord_id}:${ur.channel_id}`, ur.last_read_at);
              sqliteDb
                .prepare(`
                  INSERT INTO user_channel_reads (discord_id, channel_id, last_read_at)
                  VALUES (?, ?, ?)
                  ON CONFLICT(discord_id, channel_id) DO UPDATE SET last_read_at = excluded.last_read_at
                `)
                .run(ur.discord_id, ur.channel_id, ur.last_read_at);
            } catch {}
          }
        }

        if (mongoThreadFocusCol) {
          const storedFocus = await mongoThreadFocusCol.find({}).toArray();
          for (const f of storedFocus) {
            try {
              threadFocusCache.set(f.thread_id, f.channel_id);
              sqliteDb
                .prepare(`
                  INSERT INTO thread_focus (thread_id, channel_id)
                  VALUES (?, ?)
                  ON CONFLICT(thread_id) DO UPDATE SET channel_id = excluded.channel_id
                `)
                .run(f.thread_id, f.channel_id);
            } catch {}
          }
        }
      } catch (bundleSyncErr) {
        console.warn('UI bundle preload notice:', bundleSyncErr);
      }

      console.log('MongoDB Atlas connected. Persistent L2 cache, encrypted stores & UI bundles active.');
    } catch (err) {
      console.error('MongoDB Atlas connection error, falling back to local encrypted SQLite:', err);
    }
  }
}

export const dbService = {
  getUserPreferences(discordId: string): UserPreferences {
    const cached = userCache.get(discordId);
    if (cached) {
      return cached;
    }

    try {
      const row = sqliteDb.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId) as
        | Record<string, string>
        | undefined;

      if (row) {
        const rawCompleted = decryptField(row.setup_completed);
        const rawStatus = row.setup_status ? decryptField(row.setup_status) : null;
        let setupStatus: SetupStatus = 'none';
        if (rawStatus === 'completed' || rawCompleted === '1') {
          setupStatus = 'completed';
        } else if (rawStatus === 'pending') {
          setupStatus = 'pending';
        }
        const isCompleted = setupStatus === 'completed';

        const prefs: UserPreferences = {
          discord_id: discordId,
          target_language: decryptField(row.target_language) || 'en',
          show_original: decryptField(row.show_original) === '0' ? 0 : 1,
          flag_duration: parseInt(decryptField(row.flag_duration) || '3', 10),
          flag_mode: decryptField(row.flag_mode) === 'dm' ? 'dm' : 'channel',
          auto_translate_dm: decryptField(row.auto_translate_dm) === '1',
          auto_translate_thread: decryptField(row.auto_translate_thread) === '0' ? false : true,
          preferred_engine: decryptField(row.preferred_engine) === 'deepl' ? 'deepl' : 'google',
          setup_completed: isCompleted,
          setup_status: setupStatus,
        };
        userCache.set(discordId, prefs);
        return prefs;
      }
    } catch (err) {
      console.error('Error fetching SQLite preferences:', err);
    }

    const defaultPrefs: UserPreferences = {
      discord_id: discordId,
      target_language: 'en',
      show_original: 1,
      flag_duration: 3,
      flag_mode: 'channel',
      auto_translate_dm: false,
      auto_translate_thread: true,
      preferred_engine: 'google',
      setup_completed: false,
      setup_status: 'none',
    };
    userCache.set(discordId, defaultPrefs);
    return defaultPrefs;
  },

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    if (prefs.setup_completed) {
      prefs.setup_status = 'completed';
    } else if (prefs.setup_status === 'completed') {
      prefs.setup_completed = true;
    }
    userCache.set(prefs.discord_id, prefs);

    const encLang = encryptField(prefs.target_language);
    const encShowOriginal = encryptField(prefs.show_original.toString());
    const encDuration = encryptField(prefs.flag_duration.toString());
    const encMode = encryptField(prefs.flag_mode);
    const encAutoDm = encryptField(prefs.auto_translate_dm ? '1' : '0');
    const encAutoThread = encryptField(prefs.auto_translate_thread ? '1' : '0');
    const encEngine = encryptField(prefs.preferred_engine);
    const encSetup = encryptField(prefs.setup_completed ? '1' : '0');
    const encSetupStatus = encryptField(prefs.setup_status);

    try {
      sqliteDb.prepare(`
        INSERT INTO users (discord_id, target_language, show_original, flag_duration, flag_mode, auto_translate_dm, auto_translate_thread, preferred_engine, setup_completed, setup_status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
        ON CONFLICT(discord_id) DO UPDATE SET 
          target_language = excluded.target_language,
          show_original = excluded.show_original,
          flag_duration = excluded.flag_duration,
          flag_mode = excluded.flag_mode,
          auto_translate_dm = excluded.auto_translate_dm,
          auto_translate_thread = excluded.auto_translate_thread,
          preferred_engine = excluded.preferred_engine,
          setup_completed = excluded.setup_completed,
          setup_status = excluded.setup_status
      `).run(
        prefs.discord_id,
        encLang,
        encShowOriginal,
        encDuration,
        encMode,
        encAutoDm,
        encAutoThread,
        encEngine,
        encSetup,
        encSetupStatus
      );
    } catch (sqliteErr) {
      console.error('Failed to save to SQLite:', sqliteErr);
    }

    if (mongoUsersCol) {
      try {
        await mongoUsersCol.updateOne(
          { discord_id: prefs.discord_id },
          {
            $set: {
              discord_id: prefs.discord_id,
              target_language: encLang,
              show_original: encShowOriginal,
              flag_duration: encDuration,
              flag_mode: encMode,
              auto_translate_dm: encAutoDm,
              auto_translate_thread: encAutoThread,
              preferred_engine: encEngine,
              setup_completed: encSetup,
              setup_status: encSetupStatus,
              updated_at: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (mongoErr) {
        console.error('Failed to save to MongoDB:', mongoErr);
      }
    }
  },

  setUserLanguage(discordId: string, language: string): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.target_language = language;
    this.updateUserLiveThreadsLanguage(discordId, language);
    void this.saveUserPreferences(prefs);
  },

  setShowOriginal(discordId: string, showOriginal: boolean): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.show_original = showOriginal ? 1 : 0;
    void this.saveUserPreferences(prefs);
  },

  setFlagDuration(discordId: string, durationMinutes: number): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.flag_duration = durationMinutes;
    void this.saveUserPreferences(prefs);
  },

  setFlagMode(discordId: string, mode: 'channel' | 'dm'): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.flag_mode = mode;
    void this.saveUserPreferences(prefs);
  },

  setAutoTranslateDm(discordId: string, enabled: boolean): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.auto_translate_dm = enabled;
    void this.saveUserPreferences(prefs);
  },

  setPreferredEngine(discordId: string, engine: 'google' | 'deepl'): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.preferred_engine = engine;
    void this.saveUserPreferences(prefs);
  },

  setSetupCompleted(discordId: string, completed: boolean): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.setup_completed = completed;
    prefs.setup_status = completed ? 'completed' : (prefs.setup_status === 'pending' ? 'pending' : 'none');
    void this.saveUserPreferences(prefs);
  },

  setSetupStatus(discordId: string, status: SetupStatus): void {
    const prefs = this.getUserPreferences(discordId);
    prefs.setup_status = status;
    prefs.setup_completed = status === 'completed';
    void this.saveUserPreferences(prefs);
  },

  isSetupPromptNeeded(discordId: string): boolean {
    const prefs = this.getUserPreferences(discordId);
    return prefs.setup_status === 'none' && !prefs.setup_completed;
  },

  getAllAutoTranslateDmUsers(): UserPreferences[] {
    const users: UserPreferences[] = [];
    try {
      const rows = sqliteDb.prepare('SELECT * FROM users').all() as Array<Record<string, string>>;
      for (const row of rows) {
        const isAuto = decryptField(row.auto_translate_dm) === '1';
        if (isAuto) {
          users.push({
            discord_id: row.discord_id,
            target_language: decryptField(row.target_language) || 'en',
            show_original: decryptField(row.show_original) === '0' ? 0 : 1,
            flag_duration: parseInt(decryptField(row.flag_duration) || '5', 10),
            flag_mode: decryptField(row.flag_mode) === 'dm' ? 'dm' : 'channel',
            auto_translate_dm: true,
            auto_translate_thread: decryptField(row.auto_translate_thread) === '1',
            preferred_engine: decryptField(row.preferred_engine) === 'deepl' ? 'deepl' : 'google',
            setup_completed: decryptField(row.setup_completed) === '1',
            setup_status: (row.setup_status ? decryptField(row.setup_status) : (decryptField(row.setup_completed) === '1' ? 'completed' : 'none')) as SetupStatus,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching auto translate users:', e);
    }
    return users;
  },

  getAllAutoTranslateThreadUsers(): UserPreferences[] {
    const users: UserPreferences[] = [];
    try {
      const rows = sqliteDb.prepare('SELECT * FROM users').all() as Array<Record<string, string>>;
      for (const row of rows) {
        const isAutoThread = decryptField(row.auto_translate_thread) === '1';
        if (isAutoThread) {
          users.push({
            discord_id: row.discord_id,
            target_language: decryptField(row.target_language) || 'en',
            show_original: decryptField(row.show_original) === '0' ? 0 : 1,
            flag_duration: parseInt(decryptField(row.flag_duration) || '5', 10),
            flag_mode: decryptField(row.flag_mode) === 'dm' ? 'dm' : 'channel',
            auto_translate_dm: decryptField(row.auto_translate_dm) === '1',
            auto_translate_thread: true,
            preferred_engine: decryptField(row.preferred_engine) === 'deepl' ? 'deepl' : 'google',
            setup_completed: decryptField(row.setup_completed) === '1',
            setup_status: (row.setup_status ? decryptField(row.setup_status) : (decryptField(row.setup_completed) === '1' ? 'completed' : 'none')) as SetupStatus,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching auto translate thread users:', e);
    }
    return users;
  },

  registerLiveThread(
    discordId: string,
    guildId: string,
    channelId: string,
    threadId: string,
    targetLanguage: string
  ): void {
    const now = new Date().toISOString();
    try {
      sqliteDb
        .prepare('DELETE FROM live_threads WHERE discord_id = ? AND (guild_id = ? OR guild_id IS NULL)')
        .run(discordId, guildId);

      sqliteDb
        .prepare(`
          INSERT INTO live_threads (thread_id, discord_id, guild_id, channel_id, target_language, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(thread_id) DO UPDATE SET
            discord_id = excluded.discord_id,
            guild_id = excluded.guild_id,
            channel_id = excluded.channel_id,
            target_language = excluded.target_language
        `)
        .run(threadId, discordId, guildId, channelId, targetLanguage, now);
    } catch (err) {
      console.error('Error registering live thread:', err);
    }

    if (mongoLiveThreadsCol) {
      const col = mongoLiveThreadsCol;
      col.deleteMany({ discord_id: discordId, guild_id: guildId })
        .then(() =>
          col.updateOne(
            { thread_id: threadId },
            {
              $set: {
                thread_id: threadId,
                discord_id: discordId,
                guild_id: guildId,
                channel_id: channelId,
                target_language: targetLanguage,
                created_at: now,
              },
            },
            { upsert: true }
          )
        )
        .catch((mongoErr) => {
          console.error('Failed to sync live thread to MongoDB:', mongoErr);
        });
    }
  },

  updateLiveThreadLanguage(threadId: string, language: string): void {
    try {
      sqliteDb
        .prepare('UPDATE live_threads SET target_language = ? WHERE thread_id = ?')
        .run(language, threadId);
    } catch (err) {
      console.error('Error updating live thread language:', err);
    }

    if (mongoLiveThreadsCol) {
      mongoLiveThreadsCol
        .updateOne({ thread_id: threadId }, { $set: { target_language: language } })
        .catch((mongoErr) => {
          console.error('Failed to update live thread in MongoDB:', mongoErr);
        });
    }
  },

  updateUserLiveThreadsLanguage(discordId: string, language: string): void {
    try {
      sqliteDb
        .prepare('UPDATE live_threads SET target_language = ? WHERE discord_id = ?')
        .run(language, discordId);
    } catch (err) {
      console.error('Error updating user live threads language:', err);
    }

    if (mongoLiveThreadsCol) {
      mongoLiveThreadsCol
        .updateMany({ discord_id: discordId }, { $set: { target_language: language } })
        .catch((mongoErr) => {
          console.error('Failed to update user live threads in MongoDB:', mongoErr);
        });
    }
  },

  removeLiveThread(threadId: string): void {
    try {
      sqliteDb.prepare('DELETE FROM live_threads WHERE thread_id = ?').run(threadId);
    } catch (err) {
      console.error('Error removing live thread:', err);
    }

    if (mongoLiveThreadsCol) {
      mongoLiveThreadsCol
        .deleteOne({ thread_id: threadId })
        .catch((mongoErr) => {
          console.error('Failed to delete live thread from MongoDB:', mongoErr);
        });
    }
  },

  getLiveThread(threadId: string): LiveThreadRecord | null {
    try {
      const row = sqliteDb
        .prepare('SELECT * FROM live_threads WHERE thread_id = ?')
        .get(threadId) as LiveThreadRecord | undefined;
      return row || null;
    } catch (err) {
      console.error('Error fetching live thread by thread_id:', err);
      return null;
    }
  },

  isLiveThread(threadId: string): boolean {
    return this.getLiveThread(threadId) !== null;
  },

  getUserLiveThread(discordId: string, guildId?: string): LiveThreadRecord | null {
    try {
      if (guildId) {
        const row = sqliteDb
          .prepare('SELECT * FROM live_threads WHERE discord_id = ? AND guild_id = ?')
          .get(discordId, guildId) as LiveThreadRecord | undefined;
        if (row) return row;
      }
      const row = sqliteDb
        .prepare('SELECT * FROM live_threads WHERE discord_id = ? ORDER BY created_at DESC')
        .get(discordId) as LiveThreadRecord | undefined;
      return row || null;
    } catch (err) {
      console.error('Error fetching user live thread:', err);
      return null;
    }
  },

  getLiveThreadsForChannel(channelId: string): LiveThreadRecord[] {
    try {
      return sqliteDb
        .prepare('SELECT * FROM live_threads WHERE channel_id = ?')
        .all(channelId) as LiveThreadRecord[];
    } catch (err) {
      console.error('Error fetching live threads for channel:', err);
      return [];
    }
  },

  getLiveThreadsForGuild(guildId: string): LiveThreadRecord[] {
    try {
      return sqliteDb
        .prepare('SELECT * FROM live_threads WHERE guild_id = ?')
        .all(guildId) as LiveThreadRecord[];
    } catch (err) {
      console.error('Error fetching live threads for guild:', err);
      return [];
    }
  },

  getAllLiveThreads(): LiveThreadRecord[] {
    try {
      return sqliteDb.prepare('SELECT * FROM live_threads').all() as LiveThreadRecord[];
    } catch (err) {
      console.error('Error fetching all live threads:', err);
      return [];
    }
  },

  getUserLiveThreadInChannel(discordId: string, channelId: string): LiveThreadRecord | null {
    try {
      const row = sqliteDb
        .prepare('SELECT * FROM live_threads WHERE discord_id = ? AND channel_id = ?')
        .get(discordId, channelId) as LiveThreadRecord | undefined;
      return row || null;
    } catch (err) {
      console.error('Error fetching user live thread:', err);
      return null;
    }
  },

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

    if (mongoGuildsCol) {
      try {
        await mongoGuildsCol.updateOne(
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
    const settings = this.getGuildSettings(guildId);
    return Boolean(settings.broadcast_completed);
  },

  async setGuildBroadcastDone(guildId: string, done: boolean): Promise<void> {
    const settings = this.getGuildSettings(guildId);
    settings.broadcast_completed = done;
    await this.saveGuildSettings(settings);
  },

  async setGuildLiveThreads(guildId: string, scope: PermissionScope): Promise<void> {
    const settings = this.getGuildSettings(guildId);
    settings.allow_live_threads = scope;
    await this.saveGuildSettings(settings);
  },

  async setGuildPublicTranslations(guildId: string, scope: PermissionScope): Promise<void> {
    const settings = this.getGuildSettings(guildId);
    settings.allow_public_translations = scope;
    await this.saveGuildSettings(settings);
  },

  async setGuildFlagChannelReply(guildId: string, allowed: boolean): Promise<void> {
    const settings = this.getGuildSettings(guildId);
    settings.flag_channel_reply_allowed = allowed;
    await this.saveGuildSettings(settings);
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

    if (mongoUiBundlesCol) {
      try {
        await mongoUiBundlesCol.updateOne(
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

    if (mongoUserMutedChannelsCol) {
      mongoUserMutedChannelsCol
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

    if (mongoUserMutedChannelsCol) {
      mongoUserMutedChannelsCol
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

    if (mongoThreadFocusCol) {
      mongoThreadFocusCol
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

    if (mongoBufferedMessagesCol) {
      mongoBufferedMessagesCol
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
      ) as Array<Record<string, unknown>>;

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
        .all(discordId) as Array<{ channel_id: string; channel_name: string; cnt: number }>;
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

    if (mongoBufferedMessagesCol) {
      const filter = channelId
        ? { discord_id: discordId, channel_id: channelId }
        : { discord_id: discordId };
      mongoBufferedMessagesCol.deleteMany(filter).catch((err) => {
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

    if (mongoChannelBufferedMessagesCol) {
      mongoChannelBufferedMessagesCol
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

    if (mongoUserChannelReadsCol) {
      mongoUserChannelReadsCol
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
    const lastRead = this.getUserChannelRead(discordId, channelId);
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
    const lastRead = this.getUserChannelRead(discordId, channelId);
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
        .all(channelId, lastRead, limit) as Array<Record<string, unknown>>;

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
        .all(channelId, beforeTimestamp, limit) as Array<Record<string, unknown>>;

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
      if (this.isChannelMuted(discordId, channelId)) continue;
      const lastRead = this.getUserChannelRead(discordId, channelId);

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

const uiBundleMemoryCache = new Map<string, Record<string, string>>();

