import Database from 'better-sqlite3';
import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';
import path from 'path';
import * as fs from 'fs';
import { encryptField, decryptField } from '../utils/crypto';
import { setMongoCacheCollection, CachedTranslationDoc } from '../services/cache';

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
}

export interface LiveThreadRecord {
  thread_id: string;
  discord_id: string;
  guild_id?: string;
  channel_id: string;
  target_language: string;
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

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let mongoUsersCol: Collection<EncryptedUserRecord> | null = null;
let mongoGuildsCol: Collection<EncryptedGuildRecord> | null = null;
let mongoUiBundlesCol: Collection<UIBundleDoc> | null = null;

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
  CREATE TABLE IF NOT EXISTS live_threads (
    thread_id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
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
  sqliteDb.exec('ALTER TABLE guild_settings ADD COLUMN broadcast_completed TEXT');
} catch {}

try {
  sqliteDb.exec('ALTER TABLE live_threads ADD COLUMN guild_id TEXT');
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

        const storedUsers = await mongoUsersCol.find({}).toArray();
        for (const u of storedUsers) {
          try {
            sqliteDb
              .prepare(
                `INSERT INTO users (discord_id, target_language, show_original, flag_duration, flag_mode, auto_translate_dm, auto_translate_thread, preferred_engine, setup_completed)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(discord_id) DO UPDATE SET
                   target_language = excluded.target_language,
                   show_original = excluded.show_original,
                   flag_duration = excluded.flag_duration,
                   flag_mode = excluded.flag_mode,
                   auto_translate_dm = excluded.auto_translate_dm,
                   auto_translate_thread = excluded.auto_translate_thread,
                   preferred_engine = excluded.preferred_engine,
                   setup_completed = excluded.setup_completed`
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
                u.setup_completed
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
        const prefs: UserPreferences = {
          discord_id: discordId,
          target_language: decryptField(row.target_language) || 'en',
          show_original: decryptField(row.show_original) === '0' ? 0 : 1,
          flag_duration: parseInt(decryptField(row.flag_duration) || '3', 10),
          flag_mode: decryptField(row.flag_mode) === 'dm' ? 'dm' : 'channel',
          auto_translate_dm: decryptField(row.auto_translate_dm) === '1',
          auto_translate_thread: decryptField(row.auto_translate_thread) === '0' ? false : true,
          preferred_engine: decryptField(row.preferred_engine) === 'deepl' ? 'deepl' : 'google',
          setup_completed: decryptField(row.setup_completed) === '1',
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
    };
    userCache.set(discordId, defaultPrefs);
    return defaultPrefs;
  },

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    userCache.set(prefs.discord_id, prefs);

    const encLang = encryptField(prefs.target_language);
    const encShowOriginal = encryptField(prefs.show_original.toString());
    const encDuration = encryptField(prefs.flag_duration.toString());
    const encMode = encryptField(prefs.flag_mode);
    const encAutoDm = encryptField(prefs.auto_translate_dm ? '1' : '0');
    const encAutoThread = encryptField(prefs.auto_translate_thread ? '1' : '0');
    const encEngine = encryptField(prefs.preferred_engine);
    const encSetup = encryptField(prefs.setup_completed ? '1' : '0');

    try {
      sqliteDb.prepare(`
        INSERT INTO users (discord_id, target_language, show_original, flag_duration, flag_mode, auto_translate_dm, auto_translate_thread, preferred_engine, setup_completed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
        ON CONFLICT(discord_id) DO UPDATE SET 
          target_language = excluded.target_language,
          show_original = excluded.show_original,
          flag_duration = excluded.flag_duration,
          flag_mode = excluded.flag_mode,
          auto_translate_dm = excluded.auto_translate_dm,
          auto_translate_thread = excluded.auto_translate_thread,
          preferred_engine = excluded.preferred_engine,
          setup_completed = excluded.setup_completed
      `).run(
        prefs.discord_id,
        encLang,
        encShowOriginal,
        encDuration,
        encMode,
        encAutoDm,
        encAutoThread,
        encEngine,
        encSetup
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
    void this.saveUserPreferences(prefs);
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
  },

  updateLiveThreadLanguage(threadId: string, language: string): void {
    try {
      sqliteDb
        .prepare('UPDATE live_threads SET target_language = ? WHERE thread_id = ?')
        .run(language, threadId);
    } catch (err) {
      console.error('Error updating live thread language:', err);
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
  },

  removeLiveThread(threadId: string): void {
    try {
      sqliteDb.prepare('DELETE FROM live_threads WHERE thread_id = ?').run(threadId);
    } catch (err) {
      console.error('Error removing live thread:', err);
    }
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
      allow_live_threads: 'admin_only',
      allow_public_translations: 'admin_only',
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
};

const uiBundleMemoryCache = new Map<string, Record<string, string>>();

