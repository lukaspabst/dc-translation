import Database from 'better-sqlite3';
import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';
import path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { encryptField, decryptField } from '../utils/crypto';
import { setMongoCacheCollection, CachedTranslationDoc } from '../services/cache';
import {
  UserPreferences,
  GuildSettings,
  EncryptedUserRecord,
  EncryptedGuildRecord,
  LiveThreadRecord,
  UIBundleDoc,
  UserMutedChannelRecord,
  BufferedMessageRecord,
  ChannelMessageRecord,
  UserChannelReadRecord,
} from './dbTypes';

export const userCache = new Map<string, UserPreferences>();
export const guildCache = new Map<string, GuildSettings>();
export const mutedChannelsCache = new Set<string>();
export const threadFocusCache = new Map<string, string>();
export const userChannelReadsCache = new Map<string, number>();
export const uiBundleMemoryCache = new Map<string, Record<string, string>>();

export const mongoState: {
  client: MongoClient | null;
  db: Db | null;
  usersCol: Collection<EncryptedUserRecord> | null;
  guildsCol: Collection<EncryptedGuildRecord> | null;
  liveThreadsCol: Collection<LiveThreadRecord> | null;
  uiBundlesCol: Collection<UIBundleDoc> | null;
  userMutedChannelsCol: Collection<UserMutedChannelRecord> | null;
  bufferedMessagesCol: Collection<BufferedMessageRecord> | null;
  channelBufferedMessagesCol: Collection<ChannelMessageRecord> | null;
  userChannelReadsCol: Collection<UserChannelReadRecord> | null;
  threadFocusCol: Collection<{ thread_id: string; channel_id: string }> | null;
} = {
  client: null,
  db: null,
  usersCol: null,
  guildsCol: null,
  liveThreadsCol: null,
  uiBundlesCol: null,
  userMutedChannelsCol: null,
  bufferedMessagesCol: null,
  channelBufferedMessagesCol: null,
  userChannelReadsCol: null,
  threadFocusCol: null,
};

const dbPath = path.resolve(__dirname, '../../data.db');
export const sqliteDb = new Database(dbPath);

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

try {
  sqliteDb.exec('ALTER TABLE user_muted_channels ADD COLUMN guild_id TEXT');
} catch {}

try {
  sqliteDb.exec('ALTER TABLE user_muted_channels ADD COLUMN created_at TEXT');
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
        const certPath = path.join(os.tmpdir(), `mongodb-cert-${process.pid}.pem`);
        fs.writeFileSync(certPath, content, { mode: 0o600 });
        process.once('exit', () => {
          try {
            if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
          } catch {}
        });
        options.tlsCertificateKeyFile = certPath;
      } else if (process.env.MONGODB_CERT_PATH && fs.existsSync(process.env.MONGODB_CERT_PATH)) {
        options.tlsCertificateKeyFile = path.resolve(process.env.MONGODB_CERT_PATH);
      }

      mongoState.client = new MongoClient(mongoUri, options);
      await mongoState.client.connect();
      mongoState.db = mongoState.client.db(process.env.MONGODB_DB_NAME || 'dc_translation');

      mongoState.usersCol = mongoState.db.collection<EncryptedUserRecord>('users');
      await mongoState.usersCol.createIndex({ discord_id: 1 }, { unique: true });

      mongoState.guildsCol = mongoState.db.collection<EncryptedGuildRecord>('guild_settings');
      await mongoState.guildsCol.createIndex({ guild_id: 1 }, { unique: true });

      const cacheCol = mongoState.db.collection<CachedTranslationDoc>('translation_cache');
      await cacheCol.createIndex({ key: 1 }, { unique: true });
      await cacheCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });
      setMongoCacheCollection(cacheCol);

      mongoState.uiBundlesCol = mongoState.db.collection<UIBundleDoc>('ui_bundles');
      await mongoState.uiBundlesCol.createIndex({ bundle_key: 1 }, { unique: true });

      mongoState.liveThreadsCol = mongoState.db.collection<LiveThreadRecord>('live_threads');
      await mongoState.liveThreadsCol.createIndex({ thread_id: 1 }, { unique: true });
      await mongoState.liveThreadsCol.createIndex({ discord_id: 1, guild_id: 1 });

      mongoState.userMutedChannelsCol = mongoState.db.collection<UserMutedChannelRecord>('user_muted_channels');
      await mongoState.userMutedChannelsCol.createIndex({ discord_id: 1, channel_id: 1 }, { unique: true });
      await mongoState.userMutedChannelsCol.createIndex({ discord_id: 1, guild_id: 1 });

      mongoState.bufferedMessagesCol = mongoState.db.collection<BufferedMessageRecord>('buffered_messages');
      try {
        await mongoState.bufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
      } catch {
        try {
          await mongoState.bufferedMessagesCol.dropIndex('created_at_1');
          await mongoState.bufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
        } catch {}
      }
      await mongoState.bufferedMessagesCol.createIndex({ discord_id: 1, channel_id: 1 });

      mongoState.channelBufferedMessagesCol = mongoState.db.collection<ChannelMessageRecord>('channel_buffered_messages');
      try {
        await mongoState.channelBufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
      } catch {
        try {
          await mongoState.channelBufferedMessagesCol.dropIndex('created_at_1');
          await mongoState.channelBufferedMessagesCol.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
        } catch {}
      }
      await mongoState.channelBufferedMessagesCol.createIndex({ channel_id: 1, created_at: 1 });

      mongoState.userChannelReadsCol = mongoState.db.collection<UserChannelReadRecord>('user_channel_reads');
      await mongoState.userChannelReadsCol.createIndex({ discord_id: 1, channel_id: 1 }, { unique: true });

      mongoState.threadFocusCol = mongoState.db.collection<{ thread_id: string; channel_id: string }>('thread_focus');
      await mongoState.threadFocusCol.createIndex({ thread_id: 1 }, { unique: true });

      try {
        const storedBundles = await mongoState.uiBundlesCol.find({}).toArray();
        for (const b of storedBundles) {
          try {
            sqliteDb
              .prepare(
                'INSERT INTO ui_bundles (bundle_key, lang, data, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(bundle_key) DO UPDATE SET data = excluded.data'
              )
              .run(b.bundle_key, b.lang, b.data, b.created_at);
          } catch {}
        }

        const storedThreads = await mongoState.liveThreadsCol.find({}).toArray();
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

        const storedUsers = await mongoState.usersCol.find({}).toArray();
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

        const storedGuilds = await mongoState.guildsCol.find({}).toArray();
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

        const storedMuted = await mongoState.userMutedChannelsCol.find({}).toArray();
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

        if (mongoState.bufferedMessagesCol) {
          const storedBuffered = await mongoState.bufferedMessagesCol.find({}).toArray();
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

        if (mongoState.channelBufferedMessagesCol) {
          const storedChanMsgs = await mongoState.channelBufferedMessagesCol.find({}).toArray();
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

        if (mongoState.userChannelReadsCol) {
          const storedReads = await mongoState.userChannelReadsCol.find({}).toArray();
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

        if (mongoState.threadFocusCol) {
          const storedFocus = await mongoState.threadFocusCol.find({}).toArray();
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
