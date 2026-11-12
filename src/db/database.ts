export type {
  SetupStatus,
  UserPreferences,
  LiveThreadRecord,
  ChannelMessageItem,
  ChannelMessageRecord,
  UserChannelReadRecord,
  BufferedMessageItem,
  BufferedMessageRecord,
  UserMutedChannelRecord,
  PermissionScope,
  GuildSettings,
  UIBundleDoc,
} from './dbTypes';
export { initDatabase } from './dbCore';
import { userAndThreadRepo } from './userAndThreadRepo';
import { guildAndMessageRepo } from './guildAndMessageRepo';

export const dbService = {
  ...userAndThreadRepo,
  ...guildAndMessageRepo,
};
