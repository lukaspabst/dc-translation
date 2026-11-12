import { encryptField, decryptField } from '../utils/crypto';
import { sqliteDb, userCache, mongoState } from './dbCore';
import { SetupStatus, UserPreferences, LiveThreadRecord } from './dbTypes';

export const userAndThreadRepo = {
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

    if (mongoState.usersCol) {
      try {
        await mongoState.usersCol.updateOne(
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
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.target_language = language;
    userAndThreadRepo.updateUserLiveThreadsLanguage(discordId, language);
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  setShowOriginal(discordId: string, showOriginal: boolean): void {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.show_original = showOriginal ? 1 : 0;
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  setFlagDuration(discordId: string, durationMinutes: number): void {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.flag_duration = durationMinutes;
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  setFlagMode(discordId: string, mode: 'channel' | 'dm'): void {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.flag_mode = mode;
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  setAutoTranslateDm(discordId: string, enabled: boolean): void {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.auto_translate_dm = enabled;
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  setPreferredEngine(discordId: string, engine: 'google' | 'deepl'): void {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.preferred_engine = engine;
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  setSetupCompleted(discordId: string, completed: boolean): void {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.setup_completed = completed;
    prefs.setup_status = completed ? 'completed' : (prefs.setup_status === 'pending' ? 'pending' : 'none');
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  setSetupStatus(discordId: string, status: SetupStatus): void {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    prefs.setup_status = status;
    prefs.setup_completed = status === 'completed';
    void userAndThreadRepo.saveUserPreferences(prefs);
  },

  isSetupPromptNeeded(discordId: string): boolean {
    const prefs = userAndThreadRepo.getUserPreferences(discordId);
    return prefs.setup_status === 'none' && !prefs.setup_completed;
  },

  getAllAutoTranslateDmUsers(): UserPreferences[] {
    const users: UserPreferences[] = [];
    try {
      const rows = sqliteDb.prepare('SELECT * FROM users').all() as Record<string, string>[];
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
      const rows = sqliteDb.prepare('SELECT * FROM users').all() as Record<string, string>[];
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

    if (mongoState.liveThreadsCol) {
      const col = mongoState.liveThreadsCol;
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

    if (mongoState.liveThreadsCol) {
      mongoState.liveThreadsCol
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

    if (mongoState.liveThreadsCol) {
      mongoState.liveThreadsCol
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

    if (mongoState.liveThreadsCol) {
      mongoState.liveThreadsCol
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
    return userAndThreadRepo.getLiveThread(threadId) !== null;
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
};
