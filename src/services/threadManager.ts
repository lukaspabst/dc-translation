import {
  Guild,
  GuildMember,
  TextChannel,
  ThreadChannel,
  User,
  ChannelType,
  ThreadAutoArchiveDuration,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import {
  getUserGuildThread,
  setUserGuildThread,
  removeUserGuildThread,
} from '../db/redis';
import { dbService } from '../db/database';
import { POPULAR_LANGUAGES } from '../utils/flags';

export interface EnsureGuildThreadOptions {
  guild?: Guild;
  channel: TextChannel;
  user: User;
  targetLanguage: string;
}

export function buildLiveThreadControlComponents(
  guild: Guild,
  member: GuildMember | null,
  threadId: string,
  currentFocus = 'all'
): [ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>] {
  const textChannels = guild.channels.cache
    .filter(
      (c) =>
        c.type === ChannelType.GuildText &&
        (!member || c.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel))
    )
    .first(24);

  const options: StringSelectMenuOptionBuilder[] = [
    new StringSelectMenuOptionBuilder()
      .setLabel('All Channels (Unified Feed)')
      .setValue('focus:all')
      .setDescription('Show translations from all accessible server channels')
      .setDefault(currentFocus === 'all'),
  ];

  for (const c of textChannels) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(`# ${c.name}`)
        .setValue(`focus:${c.id}`)
        .setDescription(`Focus translations only on #${c.name}`)
        .setDefault(currentFocus === c.id)
    );
  }

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`livethread_focus:${threadId}`)
      .setPlaceholder('Filter feed by channel (Default: All Channels)...')
      .addOptions(options)
  );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`livethread_stop:${threadId}`)
      .setLabel('Stop Feed')
      .setStyle(ButtonStyle.Danger)
  );

  return [selectRow, buttonRow];
}

export async function ensureUserGuildThread(
  options: EnsureGuildThreadOptions
): Promise<ThreadChannel | null> {
  const { channel, user, targetLanguage } = options;
  const guild = options.guild || options.channel.guild;

  const cachedThreadId = await getUserGuildThread(guild.id, user.id);
  if (cachedThreadId) {
    const existing = (await guild.channels
      .fetch(cachedThreadId)
      .catch(() => null)) as ThreadChannel | null;

    if (existing && existing.isThread()) {
      if (existing.archived) {
        await existing.setArchived(false).catch(() => {});
      }
      await existing.members.add(user.id).catch(() => {});
      return existing;
    }

    await removeUserGuildThread(guild.id, user.id);
    dbService.removeLiveThread(cachedThreadId);
  }

  const sqliteExisting = dbService.getUserLiveThread(user.id, guild.id);
  if (sqliteExisting) {
    const existing = (await guild.channels
      .fetch(sqliteExisting.thread_id)
      .catch(() => null)) as ThreadChannel | null;

    if (existing && existing.isThread()) {
      if (existing.archived) {
        await existing.setArchived(false).catch(() => {});
      }
      await existing.members.add(user.id).catch(() => {});
      await setUserGuildThread(guild.id, user.id, existing.id);
      return existing;
    }

    dbService.removeLiveThread(sqliteExisting.thread_id);
  }

  const botMember =
    guild.members.me ||
    (await guild.members.fetchMe().catch(() => null));
  if (!botMember) return null;

  const hasPerms = (c: TextChannel) => {
    const p = c.permissionsFor(botMember);
    return (
      p &&
      p.has(PermissionsBitField.Flags.ViewChannel) &&
      p.has(PermissionsBitField.Flags.CreatePrivateThreads) &&
      p.has(PermissionsBitField.Flags.SendMessagesInThreads)
    );
  };

  let targetChannel: TextChannel | null = channel;
  if (!hasPerms(targetChannel)) {
    const alternative = guild.channels.cache.find(
      (c): c is TextChannel => c.type === ChannelType.GuildText && hasPerms(c as TextChannel)
    );
    if (alternative) {
      targetChannel = alternative;
    } else {
      return null;
    }
  }

  const threadTargetName = `Translations › ${user.username}`;
  const existingInCache = targetChannel.threads.cache.find(
    (t) =>
      t.isThread() &&
      t.parentId === targetChannel?.id &&
      (t.name === threadTargetName || t.name === `Translations - ${user.username}`)
  );

  if (existingInCache) {
    if (existingInCache.archived) {
      await existingInCache.setArchived(false).catch(() => {});
    }
    await existingInCache.members.add(user.id).catch(() => {});
    await setUserGuildThread(guild.id, user.id, existingInCache.id);
    dbService.registerLiveThread(
      user.id,
      guild.id,
      targetChannel.id,
      existingInCache.id,
      targetLanguage
    );
    return existingInCache;
  }

  try {
    const thread = await targetChannel.threads.create({
      name: threadTargetName,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      type: ChannelType.PrivateThread,
      reason: `Live translation feed for ${user.username}`,
    });

    await thread.members.add(user.id).catch(() => {});
    await setUserGuildThread(guild.id, user.id, thread.id);
    dbService.registerLiveThread(
      user.id,
      guild.id,
      targetChannel.id,
      thread.id,
      targetLanguage
    );

    const langInfo =
      POPULAR_LANGUAGES.find((l) => l.code === targetLanguage) || {
        name: targetLanguage.toUpperCase(),
      };

    const member = (await guild.members.fetch(user.id).catch(() => null)) as GuildMember | null;
    const [selectRow, stopRow] = buildLiveThreadControlComponents(
      guild,
      member,
      thread.id,
      'all'
    );

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('Live Translation Feed')
      .setDescription(
        'Incoming messages across server channels will be automatically translated and organized here in real time with sender impersonation.'
      )
      .addFields(
        {
          name: 'Target Language',
          value: `**${langInfo.name}** (\`${targetLanguage}\`)`,
          inline: true,
        },
        {
          name: 'Feed Focus',
          value: '`All Channels (Unified Feed)`',
          inline: true,
        },
        {
          name: 'Feed Controls',
          value:
            'Use the dropdown below to focus on a specific channel, or click "Stop Feed" to disable.',
          inline: false,
        }
      );

    await thread.send({ embeds: [welcomeEmbed], components: [selectRow, stopRow] }).catch(() => {});
    return thread;
  } catch (err) {
    console.error(`Failed to create private live thread in #${targetChannel.name}:`, err);
    return null;
  }
}
