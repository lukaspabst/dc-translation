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

export interface EncryptedUserRecord {
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

export interface EncryptedGuildRecord {
  guild_id: string;
  allow_live_threads: string;
  allow_public_translations: string;
  flag_channel_reply_allowed: string;
  default_mode: string;
  broadcast_completed?: string;
  updated_at: Date;
}

export interface UIBundleDoc {
  bundle_key: string;
  lang: string;
  data: string;
  created_at: number;
}
