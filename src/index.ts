import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  Interaction,
  Message,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageReaction,
  User,
  MessageFlags,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  AutocompleteInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ChannelType,
  ThreadAutoArchiveDuration,
  TextChannel,
  ThreadChannel,
  GuildMember,
  Guild,
  ComponentType,
  ButtonComponent,
} from 'discord.js';
import * as dotenv from 'dotenv';
import * as http from 'http';
import { initDeepL, initGoogleApi, translationService } from './services/translator';
import * as settingsCommand from './commands/settings';
import * as serverSettingsCommand from './commands/serverSettings';
import * as setupCommand from './commands/setup';
import * as setLanguageCommand from './commands/setLanguage';
import * as setShowOriginalCommand from './commands/setShowOriginal';
import * as setFlagDurationCommand from './commands/setFlagDuration';
import * as translateTextCommand from './commands/translateText';
import * as helpCommand from './commands/help';
import * as liveThreadCommand from './commands/liveThread';
import {
  ensureLiveThread,
  syncUserLiveThreadLanguage,
  buildLiveThreadControlComponents,
} from './commands/liveThread';
import { enqueueThreadMessage, flushAllBatches } from './services/messageBatcher';
import * as translateContextCommand from './commands/translateContext';
import * as translatePermanentContextCommand from './commands/translatePermanentContext';
import * as broadcastSetupCommand from './commands/broadcastSetup';
import { runServerSetupBroadcast } from './commands/broadcastSetup';
import {
  getLanguageCodeFromFlag,
  mapDiscordLocaleToLanguage,
  searchLanguages,
  POPULAR_LANGUAGES,
  getEffectiveLanguage,
} from './utils/flags';
import { dbService, initDatabase, PermissionScope, BufferedMessageItem, ChannelMessageItem } from './db/database';
import {
  createModernTranslationEmbed,
  createLiveThreadMessageEmbed,
  createBatchedChannelEmbed,
  BatchedMessageItem,
} from './utils/embeds';
import {
  getDynamicSetupLabels,
  getDynamicSettingsLabels,
  getDynamicServerLabels,
  getDynamicUILabels,
} from './services/uiTranslator';
import { isPureMediaOrUrl } from './utils/text';

dotenv.config();

const userStoppedChannels = new Map<string, Set<string>>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

interface CommandModule {
  data: { name: string };
  execute: (interaction: never) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

const commands = new Collection<string, CommandModule>();
commands.set(setupCommand.data.name, setupCommand as unknown as CommandModule);
commands.set(serverSettingsCommand.data.name, serverSettingsCommand as unknown as CommandModule);
commands.set(settingsCommand.data.name, settingsCommand as unknown as CommandModule);
commands.set(setLanguageCommand.data.name, setLanguageCommand as unknown as CommandModule);
commands.set(setShowOriginalCommand.data.name, setShowOriginalCommand as unknown as CommandModule);
commands.set(setFlagDurationCommand.data.name, setFlagDurationCommand as unknown as CommandModule);
commands.set(translateTextCommand.data.name, translateTextCommand as unknown as CommandModule);
commands.set(helpCommand.data.name, helpCommand as unknown as CommandModule);
commands.set(liveThreadCommand.data.name, liveThreadCommand as unknown as CommandModule);
commands.set(translateContextCommand.data.name, translateContextCommand as unknown as CommandModule);
commands.set(
  translatePermanentContextCommand.data.name,
  translatePermanentContextCommand as unknown as CommandModule
);
commands.set(broadcastSetupCommand.data.name, broadcastSetupCommand as unknown as CommandModule);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  initDeepL(process.env.DEEPL_AUTH_KEY);
  initGoogleApi(process.env.GOOGLE_TRANSLATE_API_KEY);
  await initDatabase();
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
    await handleCommandInteraction(interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocompleteInteraction(interaction);
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenuInteraction(interaction);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleModalSubmitInteraction(interaction);
  }
});

async function handleCommandInteraction(
  interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction
) {
  const command = commands.get(interaction.commandName);
  if (!command) return;

  const requiresSetup = ['Translate', 'Translate (Permanent)', 'translate'].includes(
    interaction.commandName
  );
  if (requiresSetup) {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (!prefs.setup_completed) {
      const clientLangCode = mapDiscordLocaleToLanguage(interaction.locale);
      const labels = await getDynamicSetupLabels(interaction.locale);
      const { embed, components, files } = setupCommand.buildClientDetectedPrompt(
        interaction.user.username,
        clientLangCode,
        interaction.locale,
        labels
      );
      await interaction.reply({
        embeds: [embed],
        components,
        files,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  try {
    await command.execute(interaction as never);
  } catch (error) {
    console.error('Command execution error:', error);
    const errPayload = {
      content: 'There was an error while executing this command!',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errPayload).catch(() => {});
    } else {
      await interaction.reply(errPayload).catch(() => {});
    }
  }
}

async function handleAutocompleteInteraction(interaction: AutocompleteInteraction) {
  const command = commands.get(interaction.commandName);
  if (command && typeof command.autocomplete === 'function') {
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }
}

const lastUnreadMessagePerThread = new Map<string, string>();

async function deliverChannelCatchupToThread(
  client: Client,
  threadId: string,
  discordId: string,
  channelId?: string
): Promise<number> {
  const thread = (await client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
  if (!thread || !thread.isThread()) return 0;

  const prefs = dbService.getUserPreferences(discordId);

  const channelIdsToProcess: string[] = [];
  if (channelId && channelId !== 'all') {
    channelIdsToProcess.push(channelId);
  } else if (thread.guild) {
    const member =
      thread.guild.members.cache.get(discordId) ||
      (await thread.guild.members.fetch(discordId).catch(() => null));
    if (member) {
      const visibleChannels = thread.guild.channels.cache.filter((c) => {
        if (c.type !== ChannelType.GuildText) return false;
        const perms = c.permissionsFor(member);
        return perms ? perms.has('ViewChannel') && perms.has('ReadMessageHistory') : false;
      });
      for (const [cId] of visibleChannels) {
        channelIdsToProcess.push(cId);
      }
    }
  }

  let totalDelivered = 0;

  for (const cId of channelIdsToProcess) {
    const totalUnreads = dbService.getUnreadCountForChannel(discordId, cId);
    const unreadItems = dbService.getUnreadMessagesForChannel(discordId, cId, 50);
    if (unreadItems.length === 0) {
      dbService.updateUserChannelRead(discordId, cId);
      continue;
    }

    const validItems: BatchedMessageItem[] = [];

    for (const item of unreadItems) {
      try {
        let translated: string;
        if (prefs.preferred_engine === 'deepl') {
          translated = await translationService.translateWithDeepL(
            item.original_text,
            prefs.target_language
          );
        } else {
          translated = await translationService.translateWithGoogle(
            item.original_text,
            prefs.target_language
          );
        }

        if (translated.trim().toLowerCase() === item.original_text.trim().toLowerCase()) {
          continue;
        }

        validItems.push({
          authorName: item.author_name,
          authorAvatar: item.author_avatar,
          translatedText: translated,
          originalText: item.original_text,
        });
      } catch (err) {
        console.error('On-demand translation error:', err);
      }
    }

    dbService.updateUserChannelRead(discordId, cId);

    if (validItems.length === 0) continue;

    const channelName = unreadItems[0].channel_name;
    const countNote = totalUnreads > validItems.length
      ? `${validItems.length} latest of ${totalUnreads} unread messages`
      : `${validItems.length} caught-up message${validItems.length > 1 ? 's' : ''}`;

    await thread
      .send(`› Focus switched to **#${channelName}** (${countNote})`)
      .catch(() => {});

    const chunkSize = 8;
    const latestUrl = unreadItems[unreadItems.length - 1].url;
    const oldestDeliveredTimestamp = unreadItems[0].created_at;
    const remainingOlder = dbService.getOlderMessagesCount(cId, oldestDeliveredTimestamp);

    for (let i = 0; i < validItems.length; i += chunkSize) {
      const chunk = validItems.slice(i, i + chunkSize);
      const isLastChunk = i + chunkSize >= validItems.length;
      const embed = createBatchedChannelEmbed({
        channelName,
        targetLanguage: prefs.target_language,
        items: chunk,
        showOriginal: prefs.show_original === 1,
      });

      const row = new ActionRowBuilder<ButtonBuilder>();
      if (isLastChunk && remainingOlder > 0) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`livethread_load_more:${cId}:${oldestDeliveredTimestamp}`)
            .setLabel(`Load More (${remainingOlder})`)
            .setStyle(ButtonStyle.Primary)
        );
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`livethread_mute:${cId}`)
          .setLabel(`Mute #${channelName}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Jump to Message ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(latestUrl)
      );

      await thread.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    totalDelivered += validItems.length;
  }

  return totalDelivered;
}

const deliverBufferedMessagesToThread = deliverChannelCatchupToThread;

async function notifyThreadUnreadActivity(
  client: Client,
  threadId: string,
  discordId: string,
  guild?: Guild | null
): Promise<void> {
  const thread = (await client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
  if (!thread || !thread.isThread()) return;

  const targetGuild = guild || thread.guild;
  if (!targetGuild) return;

  const member =
    targetGuild.members.cache.get(discordId) ||
    (await targetGuild.members.fetch(discordId).catch(() => null));
  if (!member) return;

  const currentFocus = dbService.getThreadFocus(threadId);

  const visibleChannelIds = targetGuild.channels.cache
    .filter((c) => {
      if (c.type !== ChannelType.GuildText) return false;
      if (c.id === currentFocus) return false;
      const perms = c.permissionsFor(member);
      return perms ? perms.has('ViewChannel') && perms.has('ReadMessageHistory') : false;
    })
    .map((c) => c.id);

  const counts = dbService.getUserUnreadCounts(discordId, visibleChannelIds);
  const existingMsgId = lastUnreadMessagePerThread.get(threadId);

  if (counts.size === 0) {
    if (existingMsgId) {
      const existingMsg = await thread.messages.fetch(existingMsgId).catch(() => null);
      if (existingMsg) await existingMsg.delete().catch(() => {});
      lastUnreadMessagePerThread.delete(threadId);
    }
    return;
  }

  const row = new ActionRowBuilder<ButtonBuilder>();
  let totalUnread = 0;
  let buttonsAdded = 0;

  for (const [channelId, info] of counts.entries()) {
    totalUnread += info.count;
    if (buttonsAdded < 4) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`livethread_focus_btn:${channelId}`)
          .setLabel(`Focus #${info.channelName} (${info.count})`)
          .setStyle(ButtonStyle.Secondary)
      );
      buttonsAdded++;
    }
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`livethread_focus_all:${threadId}`)
      .setLabel(`Focus All (${totalUnread})`)
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setDescription(`• Activity in other channels (${totalUnread} new message${totalUnread > 1 ? 's' : ''} waiting)`);

  if (existingMsgId) {
    const existingMsg = await thread.messages.fetch(existingMsgId).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit({ embeds: [embed], components: [row] }).catch(() => {});
      return;
    }
  }

  const newMsg = await thread.send({ embeds: [embed], components: [row] }).catch(() => null);
  if (newMsg) {
    lastUnreadMessagePerThread.set(threadId, newMsg.id);
  }
}

async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
  const customId = interaction.customId;

  if (customId === 'setup_select_lang') {
    const selected = interaction.values[0];
    dbService.setUserLanguage(interaction.user.id, selected);
    if (interaction.guild) {
      await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, selected);
    }
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(selected, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId === 'settings_select_lang') {
    const selected = interaction.values[0];
    dbService.setUserLanguage(interaction.user.id, selected);
    if (interaction.guild) {
      await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, selected);
    }
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(selected, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(prefs, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(prefs, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return;
  }

  if (customId === 'settings_select_duration') {
    const minutes = parseInt(interaction.values[0], 10);
    dbService.setFlagDuration(interaction.user.id, minutes);
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(prefs, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(prefs, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return;
  }

  if (customId.startsWith('livethread_focus:')) {
    const threadId = customId.split(':')[1];
    if (!threadId) return;

    const selectedValue = interaction.values[0];
    const isAll = selectedValue === 'focus:all';
    const targetChannelId = isAll ? 'all' : selectedValue.replace('focus:', '');

    if (!isAll && interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
      if (targetChannel) {
        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
          const perms = targetChannel.permissionsFor(member);
          if (!perms || !perms.has('ViewChannel') || !perms.has('ReadMessageHistory')) {
            await interaction.reply({
              content: 'You do not have permission to view this channel.',
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
        }
      }
    }

    dbService.setThreadFocus(threadId, targetChannelId);

    let channelName = 'All Channels';
    if (!isAll && interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
      if (targetChannel) {
        channelName = `#${targetChannel.name}`;
      }
    }

    if (interaction.guild) {
      const member =
        interaction.member instanceof GuildMember
          ? interaction.member
          : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const [selectRow, stopRow] = buildLiveThreadControlComponents(
        interaction.guild,
        member,
        threadId,
        targetChannelId
      );
      await interaction.update({ components: [selectRow, stopRow] }).catch(() => {});
    }

    const deliveredCount = isAll
      ? await deliverBufferedMessagesToThread(interaction.client, threadId, interaction.user.id)
      : await deliverBufferedMessagesToThread(
          interaction.client,
          threadId,
          interaction.user.id,
          targetChannelId
        );

    if (deliveredCount === 0) {
      const thread = (await interaction.client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
      if (thread && thread.isThread()) {
        await thread.send(`› Focus switched to **${channelName}**`).catch(() => {});
      }
    }

    await notifyThreadUnreadActivity(interaction.client, threadId, interaction.user.id, interaction.guild);

    await interaction.followUp({
      content: isAll
        ? 'Feed focus set to All Channels (Unified Feed).'
        : `Feed focus set to ${channelName}. Other channels will be buffered while you are focused here.`,
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  if (customId.startsWith('translate_switch:')) {
    const parts = customId.split(':');
    if (parts.length !== 3) return;
    const channelId = parts[1];
    const messageId = parts[2];
    const targetLanguage = interaction.values[0];

    await interaction.deferUpdate();

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) return;
      const targetMsg = await channel.messages.fetch(messageId);
      if (!targetMsg.content) return;

      const userPrefs = dbService.getUserPreferences(interaction.user.id);
      const translatedText = await translationService.translateWithGoogle(
        targetMsg.content,
        targetLanguage
      );
      const ui = await getDynamicUILabels(targetLanguage);

      const embed = createModernTranslationEmbed({
        author: targetMsg.author,
        translatedText,
        targetLanguage,
        originalText: targetMsg.content,
        showOriginal: userPrefs.show_original === 1,
        engine: 'google',
        locale: interaction.locale,
      });

      const [selectRow, buttonsRow] = translateContextCommand.buildTranslationComponents(
        channelId,
        messageId,
        targetLanguage,
        true,
        ui,
        interaction.locale
      );

      await interaction.editReply({
        embeds: [embed],
        components: [selectRow, buttonsRow],
      });
    } catch (err) {
      console.error('Error switching language:', err);
    }
  }
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
  const customId = interaction.customId;

  if (customId === 'translate_dismiss') {
    try {
      if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
        await interaction.deleteReply().catch(async () => {
          await interaction.update({ content: 'Dismissed.', embeds: [], components: [] });
        });
      } else {
        await interaction.message.delete().catch(() => {});
      }
    } catch (e) {
      console.error('Dismiss error:', e);
    }
    return;
  }

  if (customId === 'setup_detect_client') {
    const clientLangCode = mapDiscordLocaleToLanguage(interaction.locale);
    const labels = await getDynamicSetupLabels(interaction.locale);
    const { embed, components, files } = setupCommand.buildClientDetectedPrompt(
      interaction.user.username,
      clientLangCode,
      interaction.locale,
      labels
    );
    await interaction.update({ embeds: [embed], components, files });
    return;
  }

  if (customId === 'setup_step:1') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components, files: [] });
    return;
  }

  if (customId === 'setup_open_search_modal') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const modal = new ModalBuilder()
      .setCustomId('setup_search_modal')
      .setTitle(labels.searchModalTitle.slice(0, 45));

    const searchInput = new TextInputBuilder()
      .setCustomId('setup_search_query')
      .setLabel(labels.searchModalLabel.slice(0, 45))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(labels.searchModalPlaceholder.slice(0, 100))
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(50);

    const modalRow = new ActionRowBuilder<TextInputBuilder>().addComponents(searchInput);
    modal.addComponents(modalRow);
    await interaction.showModal(modal);
    return;
  }

  if (customId === 'setup_reset_search') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId.startsWith('setup_page:')) {
    const pageStr = customId.split(':')[1];
    const page = parseInt(pageStr, 10) || 0;
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
      page,
      clientLocale: interaction.locale,
    });
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId.startsWith('setup_step:2')) {
    const parts = customId.split(':');
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (parts.length > 2 && parts[2]) {
      prefs.target_language = parts[2];
      await dbService.saveUserPreferences(prefs);
      dbService.updateUserLiveThreadsLanguage(interaction.user.id, parts[2]);
      if (interaction.guild) {
        await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, parts[2]);
      }
    }
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components, files: [] });
    return;
  }

  if (customId === 'setup_step:3') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep3(prefs, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId === 'setup_mode:ephemeral') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    prefs.auto_translate_dm = false;
    prefs.auto_translate_thread = false;
    prefs.flag_mode = 'channel';
    await dbService.saveUserPreferences(prefs);
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId === 'setup_mode:dm') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    prefs.auto_translate_dm = true;
    prefs.auto_translate_thread = false;
    prefs.flag_mode = 'channel';
    await dbService.saveUserPreferences(prefs);
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId === 'setup_mode:thread') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    prefs.auto_translate_dm = false;
    prefs.auto_translate_thread = true;
    prefs.flag_mode = 'channel';
    await dbService.saveUserPreferences(prefs);
    const guildSettings = interaction.guildId ? dbService.getGuildSettings(interaction.guildId) : null;
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep2(prefs, guildSettings, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId === 'setup_toggle_original') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    dbService.setShowOriginal(interaction.user.id, !prefs.show_original);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep3(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId === 'setup_toggle_engine') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const newEngine = prefs.preferred_engine === 'deepl' ? 'google' : 'deepl';
    dbService.setPreferredEngine(interaction.user.id, newEngine);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildStep3(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components });
    return;
  }

async function resolveTargetTextChannelForUser(
  client: Client,
  userId: string,
  guildId?: string | null
): Promise<TextChannel | null> {
  if (guildId) {
    const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
    if (guild) {
      const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      if (me) {
        const ch = guild.channels.cache.find((c) => {
          if (c.type !== ChannelType.GuildText) return false;
          const perms = c.permissionsFor(me);
          return perms ? perms.has('CreatePrivateThreads') : false;
        }) as TextChannel | undefined;
        if (ch) return ch;
      }
    }
  }

  for (const guild of client.guilds.cache.values()) {
    const isMember =
      guild.members.cache.has(userId) ||
      (await guild.members.fetch(userId).catch(() => null));
    if (isMember) {
      const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      if (me) {
        const textChannel = guild.channels.cache.find((c) => {
          if (c.type !== ChannelType.GuildText) return false;
          const perms = c.permissionsFor(me);
          return perms ? perms.has('CreatePrivateThreads') : false;
        }) as TextChannel | undefined;
        if (textChannel) return textChannel;
      }
    }
  }
  return null;
}

  if (customId === 'setup_finish') {
    dbService.setSetupCompleted(interaction.user.id, true);
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildCompletion(prefs, effectiveLang, labels);

    if (prefs.auto_translate_thread) {
      const targetChannel = await resolveTargetTextChannelForUser(
        interaction.client,
        interaction.user.id,
        interaction.guildId
      );
      if (targetChannel) {
        const thread = await ensureLiveThread({
          channel: targetChannel,
          user: interaction.user,
          targetLanguage: prefs.target_language,
        });
        if (thread) {
          embed.addFields({
            name: 'Live Thread Ready',
            value: `Your private thread <#${thread.id}> is active in #${targetChannel.name}! Translations will stream automatically.`,
            inline: false,
          });
        }
      }
    }

    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId.startsWith('setup_quick_start:') || customId === 'setup_quick_finish') {
    const parts = customId.split(':');
    const chosenLang = parts.length > 1 ? parts[1] : undefined;
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (chosenLang) {
      prefs.target_language = chosenLang;
    } else if (!prefs.target_language || prefs.target_language === 'en') {
      if (interaction.locale) {
        prefs.target_language = mapDiscordLocaleToLanguage(interaction.locale);
      }
    }
    prefs.preferred_engine = 'google';
    prefs.show_original = 1;
    prefs.flag_duration = 3;
    prefs.flag_mode = 'channel';
    prefs.auto_translate_dm = false;
    prefs.auto_translate_thread = true;
    prefs.setup_completed = true;
    await dbService.saveUserPreferences(prefs);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSetupLabels(effectiveLang);
    const { embed, components } = setupCommand.buildCompletion(prefs, effectiveLang, labels);

    if (prefs.auto_translate_thread) {
      const targetChannel = await resolveTargetTextChannelForUser(
        interaction.client,
        interaction.user.id,
        interaction.guildId
      );
      if (targetChannel) {
        const thread = await ensureLiveThread({
          channel: targetChannel,
          user: interaction.user,
          targetLanguage: prefs.target_language,
        });
        if (thread) {
          embed.addFields({
            name: 'Live Thread Ready',
            value: `Your private thread <#${thread.id}> is active in #${targetChannel.name}! Translations will stream automatically.`,
            inline: false,
          });
        }
      }
    }

    await interaction.update({ embeds: [embed], components });
    return;
  }

  if (customId.startsWith('server_toggle_threads:')) {
    if (!interaction.guildId) return;
    const isStaff =
      interaction.memberPermissions?.has('ManageGuild') ||
      interaction.memberPermissions?.has('Administrator');
    if (!isStaff) {
      await interaction.reply({
        content: 'Only server staff can configure server guardrails.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const nextScope = customId.split(':')[1] as PermissionScope;
    await dbService.setGuildLiveThreads(interaction.guildId, nextScope);
    const settings = dbService.getGuildSettings(interaction.guildId);
    const labels = await getDynamicServerLabels(interaction.locale);
    const embed = serverSettingsCommand.buildServerSettingsEmbed(settings, interaction.locale, labels);
    const [row1, row2] = serverSettingsCommand.buildServerSettingsComponents(settings, interaction.locale, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    return;
  }

  if (customId.startsWith('server_toggle_public:')) {
    if (!interaction.guildId) return;
    const isStaff =
      interaction.memberPermissions?.has('ManageGuild') ||
      interaction.memberPermissions?.has('Administrator');
    if (!isStaff) {
      await interaction.reply({
        content: 'Only server staff can configure server guardrails.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const nextScope = customId.split(':')[1] as PermissionScope;
    await dbService.setGuildPublicTranslations(interaction.guildId, nextScope);
    const settings = dbService.getGuildSettings(interaction.guildId);
    const labels = await getDynamicServerLabels(interaction.locale);
    const embed = serverSettingsCommand.buildServerSettingsEmbed(settings, interaction.locale, labels);
    const [row1, row2] = serverSettingsCommand.buildServerSettingsComponents(settings, interaction.locale, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    return;
  }

  if (customId === 'server_toggle_flags') {
    if (!interaction.guildId) return;
    const isStaff =
      interaction.memberPermissions?.has('ManageGuild') ||
      interaction.memberPermissions?.has('Administrator');
    if (!isStaff) {
      await interaction.reply({
        content: 'Only server staff can configure server guardrails.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const current = dbService.getGuildSettings(interaction.guildId);
    await dbService.setGuildFlagChannelReply(interaction.guildId, !current.flag_channel_reply_allowed);
    const settings = dbService.getGuildSettings(interaction.guildId);
    const labels = await getDynamicServerLabels(interaction.locale);
    const embed = serverSettingsCommand.buildServerSettingsEmbed(settings, interaction.locale, labels);
    const [row1, row2] = serverSettingsCommand.buildServerSettingsComponents(settings, interaction.locale, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    return;
  }

  if (customId === 'settings_open_from_help') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(prefs, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(prefs, effectiveLang, labels);
    await interaction.reply({
      embeds: [embed],
      components: [row1, row2, row3, row4],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId === 'settings_toggle_original') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    dbService.setShowOriginal(interaction.user.id, !prefs.show_original);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(updated, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return;
  }

  if (customId.startsWith('settings_mode:')) {
    const mode = customId.split(':')[1];
    const prefs = dbService.getUserPreferences(interaction.user.id);
    if (mode === 'thread') {
      prefs.auto_translate_thread = true;
      prefs.auto_translate_dm = false;
      prefs.flag_mode = 'channel';
    } else if (mode === 'dm') {
      prefs.auto_translate_thread = false;
      prefs.auto_translate_dm = true;
      prefs.flag_mode = 'channel';
    } else {
      prefs.auto_translate_thread = false;
      prefs.auto_translate_dm = false;
      prefs.flag_mode = 'channel';
    }
    await dbService.saveUserPreferences(prefs);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(updated, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return;
  }

  if (customId === 'settings_toggle_engine') {
    const prefs = dbService.getUserPreferences(interaction.user.id);
    const newEngine = prefs.preferred_engine === 'deepl' ? 'google' : 'deepl';
    dbService.setPreferredEngine(interaction.user.id, newEngine);
    const updated = dbService.getUserPreferences(interaction.user.id);
    const effectiveLang = getEffectiveLanguage(updated.target_language, interaction.locale);
    const labels = await getDynamicSettingsLabels(effectiveLang);
    const embed = settingsCommand.buildSettingsEmbed(updated, effectiveLang, labels);
    const [row1, row2, row3, row4] = settingsCommand.buildSettingsComponents(updated, effectiveLang, labels);
    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
    return;
  }

  if (customId.startsWith('livethread_stop:')) {
    const threadId = customId.split(':')[1];
    if (!threadId) return;

    dbService.removeLiveThread(threadId);

    try {
      const threadChannel = await client.channels.fetch(threadId).catch(() => null);
      if (threadChannel && threadChannel.isThread()) {
        const parentId = threadChannel.parentId;
        if (parentId) {
          if (!userStoppedChannels.has(interaction.user.id)) {
            userStoppedChannels.set(interaction.user.id, new Set<string>());
          }
          userStoppedChannels.get(interaction.user.id)?.add(parentId);
        }
        await threadChannel.send('Live translation feed stopped by user. Archiving thread...').catch(() => {});
        await threadChannel.setArchived(true).catch(() => {});
      }
    } catch (err) {
      console.warn('Error archiving thread on stop:', err);
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          'Live translation feed stopped and thread archived. You can restart anytime by clicking Live Thread on any translation.',
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
    return;
  }

  if (customId.startsWith('livethread_mute:')) {
    const channelId = customId.split(':')[1];
    if (!channelId || !interaction.guildId) return;

    await dbService.muteChannel(interaction.user.id, channelId, interaction.guildId);

    const channel = interaction.guild
      ? interaction.guild.channels.cache.get(channelId) ||
        (await interaction.guild.channels.fetch(channelId).catch(() => null))
      : null;
    const channelName = channel && 'name' in channel ? channel.name : 'this channel';

    const unmuteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`livethread_unmute:${channelId}`)
        .setLabel(`Unmute #${channelName}`)
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: `Muted #${channelName}. You will no longer receive live translations for this channel.`,
      components: [unmuteRow],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId.startsWith('livethread_unmute:')) {
    const channelId = customId.split(':')[1];
    if (!channelId) return;

    await dbService.unmuteChannel(interaction.user.id, channelId);

    const channel = interaction.guild
      ? interaction.guild.channels.cache.get(channelId) ||
        (await interaction.guild.channels.fetch(channelId).catch(() => null))
      : null;
    const channelName = channel && 'name' in channel ? channel.name : 'this channel';

    await interaction.update({
      content: `Unmuted #${channelName}. Live translations for this channel have been restored.`,
      components: [],
    });
    return;
  }

  if (customId.startsWith('livethread_load_more:')) {
    const parts = customId.split(':');
    const channelId = parts[1];
    const beforeTimestamp = Number(parts[2]);
    if (!channelId || isNaN(beforeTimestamp)) return;

    if (interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(channelId);
      if (targetChannel) {
        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
          const perms = targetChannel.permissionsFor(member);
          if (!perms || !perms.has('ViewChannel') || !perms.has('ReadMessageHistory')) {
            await interaction.reply({
              content: 'You do not have permission to view this channel.',
              flags: MessageFlags.Ephemeral,
            }).catch(() => {});
            return;
          }
        }
      }
    }

    await interaction.deferUpdate().catch(() => {});

    if (interaction.message && interaction.message.components.length > 0) {
      const updatedRows = interaction.message.components
        .map((row) => {
          if (!('components' in row)) return null;
          const newRow = new ActionRowBuilder<ButtonBuilder>();
          for (const comp of row.components) {
            if (comp.type === ComponentType.Button && comp.customId?.startsWith('livethread_load_more:')) {
              continue;
            }
            if (comp.type === ComponentType.Button) {
              newRow.addComponents(ButtonBuilder.from(comp as ButtonComponent));
            }
          }
          return newRow;
        })
        .filter((r): r is ActionRowBuilder<ButtonBuilder> => r !== null && r.components.length > 0);

      await interaction.message.edit({ components: updatedRows }).catch(() => {});
    }

    const thread = interaction.channel as ThreadChannel | null;
    if (!thread || !thread.isThread()) return;

    const olderItems = dbService.getOlderMessagesForChannel(channelId, beforeTimestamp, 50);
    if (olderItems.length === 0) return;

    const prefs = dbService.getUserPreferences(interaction.user.id);
    const validItems: BatchedMessageItem[] = [];

    for (const item of olderItems) {
      try {
        let translated: string;
        if (prefs.preferred_engine === 'deepl') {
          translated = await translationService.translateWithDeepL(
            item.original_text,
            prefs.target_language
          );
        } else {
          translated = await translationService.translateWithGoogle(
            item.original_text,
            prefs.target_language
          );
        }

        if (translated.trim().toLowerCase() === item.original_text.trim().toLowerCase()) {
          continue;
        }

        validItems.push({
          authorName: item.author_name,
          authorAvatar: item.author_avatar,
          translatedText: translated,
          originalText: item.original_text,
        });
      } catch (err) {
        console.error('Load more translation error:', err);
      }
    }

    if (validItems.length === 0) return;

    const channelName = olderItems[0].channel_name;
    const newOldestTimestamp = olderItems[0].created_at;
    const remainingOlder = dbService.getOlderMessagesCount(channelId, newOldestTimestamp);

    await thread
      .send(`› Loaded **${validItems.length}** earlier message${validItems.length > 1 ? 's' : ''} from **#${channelName}**`)
      .catch(() => {});

    const chunkSize = 8;
    const latestUrl = olderItems[olderItems.length - 1].url;
    for (let i = 0; i < validItems.length; i += chunkSize) {
      const chunk = validItems.slice(i, i + chunkSize);
      const isLastChunk = i + chunkSize >= validItems.length;
      const embed = createBatchedChannelEmbed({
        channelName,
        targetLanguage: prefs.target_language,
        items: chunk,
        showOriginal: prefs.show_original === 1,
      });

      const row = new ActionRowBuilder<ButtonBuilder>();
      if (isLastChunk && remainingOlder > 0) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`livethread_load_more:${channelId}:${newOldestTimestamp}`)
            .setLabel(`Load More (${remainingOlder})`)
            .setStyle(ButtonStyle.Primary)
        );
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`livethread_mute:${channelId}`)
          .setLabel(`Mute #${channelName}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Jump to Message ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(latestUrl)
      );

      await thread.send({ embeds: [embed], components: [row] }).catch(() => {});
    }
    return;
  }

  if (
    customId.startsWith('livethread_focus_btn:') ||
    customId.startsWith('livethread_catchup:')
  ) {
    const channelId = customId.split(':')[1];
    if (!channelId) return;

    if (interaction.guild) {
      const targetChannel = interaction.guild.channels.cache.get(channelId);
      if (targetChannel) {
        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
          const perms = targetChannel.permissionsFor(member);
          if (!perms || !perms.has('ViewChannel') || !perms.has('ReadMessageHistory')) {
            await interaction.reply({
              content: 'You do not have permission to view this channel.',
              flags: MessageFlags.Ephemeral,
            }).catch(() => {});
            return;
          }
        }
      }
    }

    await interaction.deferUpdate().catch(() => {});

    const thread = interaction.channel as ThreadChannel | null;
    if (thread && thread.isThread()) {
      dbService.setThreadFocus(thread.id, channelId);

      const targetChannel = interaction.guild?.channels.cache.get(channelId);
      const channelName = targetChannel ? `#${targetChannel.name}` : 'this channel';

      const deliveredCount = await deliverBufferedMessagesToThread(
        interaction.client,
        thread.id,
        interaction.user.id,
        channelId
      );

      if (deliveredCount === 0) {
        await thread.send(`› Focus switched to **${channelName}**`).catch(() => {});
      }

      await notifyThreadUnreadActivity(interaction.client, thread.id, interaction.user.id, interaction.guild);
    }
    return;
  }

  if (
    customId.startsWith('livethread_focus_all:') ||
    customId.startsWith('livethread_catchup_all:')
  ) {
    const threadId = customId.split(':')[1];
    if (!threadId) return;

    await interaction.deferUpdate().catch(() => {});

    dbService.setThreadFocus(threadId, 'all');
    const deliveredCount = await deliverBufferedMessagesToThread(
      interaction.client,
      threadId,
      interaction.user.id
    );

    if (deliveredCount === 0) {
      const thread = (await interaction.client.channels.fetch(threadId).catch(() => null)) as ThreadChannel | null;
      if (thread && thread.isThread()) {
        await thread.send('› Focus switched to **All Channels**').catch(() => {});
      }
    }

    await notifyThreadUnreadActivity(interaction.client, threadId, interaction.user.id, interaction.guild);
    return;
  }

  if (customId.startsWith('livethread_open:')) {
    const parts = customId.split(':');
    if (parts.length < 4) return;
    const channelId = parts[1];
    const messageId = parts[2];
    const targetLanguage = parts[3];

    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Live thread translation is only available in server channels.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildSettings = dbService.getGuildSettings(interaction.guildId);
    if (guildSettings.allow_live_threads === 'disabled') {
      await interaction.reply({
        content: 'Live translation threads are disabled in this server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (guildSettings.allow_live_threads === 'admin_only') {
      const isStaff =
        interaction.memberPermissions?.has('ManageGuild') ||
        interaction.memberPermissions?.has('Administrator');
      if (!isStaff) {
        await interaction.reply({
          content: 'Live translation threads are restricted to server staff in this server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.editReply({
          content: 'Live translation threads can only be opened in standard text channels.',
        });
        return;
      }

      const textChannel = channel as TextChannel;
      const thread = await ensureLiveThread({
        channel: textChannel,
        user: interaction.user,
        targetLanguage,
      });

      if (!thread) {
        await interaction.editReply({
          content:
            'Could not create live thread. Please verify bot permissions (`Create Private Threads`, `Send Messages in Threads`).',
        });
        return;
      }

      userStoppedChannels.get(interaction.user.id)?.delete(channelId);

      if (messageId && messageId !== '0') {
        const targetMsg = await textChannel.messages.fetch(messageId).catch(() => null);
        if (targetMsg && targetMsg.content) {
          const userPrefs = dbService.getUserPreferences(interaction.user.id);
          const translated = await translationService.translateWithGoogle(
            targetMsg.content,
            targetLanguage
          );
          const channelName = textChannel.name;
          const msgEmbed = createLiveThreadMessageEmbed(
            targetMsg.author,
            translated,
            targetLanguage,
            channelName,
            targetMsg.content,
            userPrefs.show_original === 1
          );
          const jumpRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel('Jump to Message ↗')
              .setStyle(ButtonStyle.Link)
              .setURL(targetMsg.url)
          );
          await thread.send({ embeds: [msgEmbed], components: [jumpRow] });
        }
      }

      const threadRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Open Live Thread ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guildId}/${thread.id}`)
      );

      await interaction.editReply({
        content: `Live translation thread active: <#${thread.id}>\nTranslations in this channel will stream directly to your private thread!`,
        components: [threadRow],
      });
    } catch (err: unknown) {
      console.error('Error opening live thread:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      await interaction.editReply({
        content: `Error opening live thread: ${errMsg}`,
      });
    }
    return;
  }

  if (customId.startsWith('translate_share:')) {
    const parts = customId.split(':');
    if (parts.length !== 4) return;
    const channelId = parts[1];
    const messageId = parts[2];
    const targetLanguage = parts[3];

    if (interaction.guildId) {
      const guildSettings = dbService.getGuildSettings(interaction.guildId);
      if (guildSettings.allow_public_translations === 'disabled') {
        await interaction.reply({
          content: 'Sharing translations publicly is disabled in this server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (guildSettings.allow_public_translations === 'admin_only') {
        const isStaff =
          interaction.memberPermissions?.has('ManageGuild') ||
          interaction.memberPermissions?.has('Administrator');
        if (!isStaff) {
          await interaction.reply({
            content:
              'Sharing translations to public channels is restricted to server staff to prevent channel clutter.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !('messages' in channel) || !('send' in channel)) return;
      const targetMsg = await channel.messages.fetch(messageId);
      if (!targetMsg.content) return;

      const userPrefs = dbService.getUserPreferences(interaction.user.id);
      const translatedText = await translationService.translateWithGoogle(
        targetMsg.content,
        targetLanguage
      );
      const ui = await getDynamicUILabels(targetLanguage);

      const embed = createModernTranslationEmbed({
        author: targetMsg.author,
        translatedText,
        targetLanguage,
        originalText: targetMsg.content,
        showOriginal: userPrefs.show_original === 1,
        engine: 'google',
        locale: interaction.locale,
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`deepl_translate:${channelId}:${messageId}:${targetLanguage}`)
          .setLabel(ui.deeplBtn)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('translate_dismiss')
          .setLabel(ui.dismiss)
          .setStyle(ButtonStyle.Danger)
      );

      await (channel as unknown as { send: (payload: unknown) => Promise<unknown> }).send({
        content: `<@${interaction.user.id}> ${ui.requestedBy}`,
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content: 'Translation shared with channel.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('Error sharing translation:', err);
    }
    return;
  }

  if (customId.startsWith('deepl_translate:')) {
    await handleDeepLButton(interaction);
    return;
  }

  if (customId.startsWith('translate_text_deepl:')) {
    const targetLanguage = customId.split(':')[1] || 'en';
    await interaction.deferUpdate();
    const existingEmbed = interaction.message.embeds[0];
    if (!existingEmbed) return;

    const originalField = existingEmbed.fields.find((f) => f.name.includes('Original'));
    const textToTranslate = originalField
      ? originalField.value.replace(/^>>>\s*/, '')
      : existingEmbed.fields[0]?.value;

    if (!textToTranslate) return;

    try {
      const translated = await translationService.translateWithDeepL(
        textToTranslate,
        targetLanguage
      );
      const ui = await getDynamicUILabels(targetLanguage);
      const updatedEmbed = EmbedBuilder.from(existingEmbed)
        .setColor('#8B5CF6')
        .setTitle(`${ui.title} (DeepL)`)
        .setFields(
          existingEmbed.fields.map((field) => {
            if (field.name.includes('Translated') || field.name === ui.translated) {
              return { name: `${ui.translated} (DeepL)`, value: translated.substring(0, 1024) };
            }
            return field;
          })
        );

      const dismissRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('translate_dismiss')
          .setLabel(ui.dismiss)
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({ embeds: [updatedEmbed], components: [dismissRow] });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'DeepL error occurred';
      await interaction.followUp({ content: errMsg, flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleModalSubmitInteraction(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;

  if (customId === 'setup_search_modal') {
    const query = interaction.fields.getTextInputValue('setup_search_query');
    let prefs = dbService.getUserPreferences(interaction.user.id);
    const currentEffective = getEffectiveLanguage(prefs.target_language, interaction.locale);
    const matches = searchLanguages(query, currentEffective);

    if (matches.length === 1) {
      const chosenLang = matches[0].code;
      dbService.setUserLanguage(interaction.user.id, chosenLang);
      if (interaction.guild) {
        await syncUserLiveThreadLanguage(interaction.guild, interaction.user.id, chosenLang);
      }
      prefs = dbService.getUserPreferences(interaction.user.id);
      const effectiveLang = getEffectiveLanguage(chosenLang, interaction.locale);
      const labels = await getDynamicSetupLabels(effectiveLang);
      const { embed, components } = setupCommand.buildStep1(prefs, effectiveLang, labels, {
        page: 0,
        searchQuery: query,
        searchResults: matches,
        clientLocale: interaction.locale,
      });
      if (interaction.isFromMessage()) {
        await interaction.update({ embeds: [embed], components });
      } else {
        await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    if (matches.length > 1) {
      const labels = await getDynamicSetupLabels(currentEffective);
      const { embed, components } = setupCommand.buildStep1(prefs, currentEffective, labels, {
        page: 0,
        searchQuery: query,
        searchResults: matches,
        clientLocale: interaction.locale,
      });
      if (interaction.isFromMessage()) {
        await interaction.update({ embeds: [embed], components });
      } else {
        await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    const labels = await getDynamicSetupLabels(currentEffective);
    const { embed, components } = setupCommand.buildStep1(prefs, currentEffective, labels, {
      page: 0,
      searchQuery: query,
      searchNotice: labels.noSearchMatch(query),
      clientLocale: interaction.locale,
    });
    if (interaction.isFromMessage()) {
      await interaction.update({ embeds: [embed], components });
    } else {
      await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
    }
    return;
  }
}

client.on(Events.MessageReactionAdd, async (reaction: MessageReaction | unknown, user: User | unknown) => {
  const discordUser = user as User;
  if (!discordUser || discordUser.bot) return;

  const msgReaction = reaction as MessageReaction;
  if (msgReaction.partial) {
    try {
      await msgReaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  const message = msgReaction.message;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.error('Error fetching message:', error);
      return;
    }
  }

  if (!message.content || message.content.trim() === '' || isPureMediaOrUrl(message.content)) return;

  const emojiName = msgReaction.emoji.name;
  if (!emojiName) return;

  const targetLanguage = getLanguageCodeFromFlag(emojiName);
  if (!targetLanguage) return;

  try {
    const userPrefs = dbService.getUserPreferences(discordUser.id);
    if (!userPrefs.setup_completed) {
      dbService.setUserLanguage(discordUser.id, targetLanguage);
      dbService.setSetupCompleted(discordUser.id, true);
    }

    const translatedText = await translationService.translateWithGoogle(
      message.content,
      targetLanguage
    );
    const ui = await getDynamicUILabels(targetLanguage);

    const embed = createModernTranslationEmbed({
      author: message.author,
      translatedText,
      targetLanguage,
      originalText: message.content,
      showOriginal: userPrefs.show_original === 1,
      engine: 'google',
      locale: targetLanguage,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`deepl_translate:${message.channelId}:${message.id}:${targetLanguage}`)
        .setLabel(ui.deeplBtn)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`livethread_open:${message.channelId}:${message.id}:${targetLanguage}`)
        .setLabel(ui.liveThreadBtn)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('translate_dismiss')
        .setLabel(ui.dismiss)
        .setStyle(ButtonStyle.Danger)
    );

    const guildSettings = message.guildId ? dbService.getGuildSettings(message.guildId) : null;
    const allowFlagReactions = guildSettings ? guildSettings.flag_channel_reply_allowed : true;

    if (!allowFlagReactions) {
      await msgReaction.users.remove(discordUser.id).catch(() => {});
      return;
    }

    const messagePayload = {
      content: `<@${discordUser.id}> ${ui.requestedBy}`,
      embeds: [embed],
      components: [row],
    };

    let replyMsg: Message | null = null;
    try {
      replyMsg = await message.reply(messagePayload);
    } catch (replyError) {
      console.warn('Failed to reply, falling back to channel send:', replyError);
      if (message.channel && 'send' in message.channel) {
        replyMsg = (await (
          message.channel as unknown as { send: (payload: unknown) => Promise<Message> }
        ).send(messagePayload)) as Message;
      }
    }

    if (userPrefs.flag_duration > 0 && replyMsg) {
      setTimeout(() => {
        replyMsg?.delete().catch(() => {});
      }, userPrefs.flag_duration * 60000);
    }

    await msgReaction.users.remove(discordUser.id).catch(() => {});
  } catch (error) {
    console.error('Reaction translation error:', error);
  }
});

async function handleDeepLButton(interaction: ButtonInteraction) {
  await interaction.deferUpdate();

  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const channelId = parts[1];
  const messageId = parts[2];
  const targetLanguage = parts[3];

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !('messages' in channel)) {
      throw new Error('Could not fetch channel');
    }

    const message: Message = await channel.messages.fetch(messageId);
    if (!message.content) {
      await interaction.followUp({
        content: 'Original message content is empty.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const translatedText = await translationService.translateWithDeepL(
      message.content,
      targetLanguage
    );
    const ui = await getDynamicUILabels(targetLanguage);
    const userPrefs = dbService.getUserPreferences(interaction.user.id);

    const embed = createModernTranslationEmbed({
      author: message.author,
      translatedText,
      targetLanguage,
      originalText: message.content,
      showOriginal: userPrefs.show_original === 1,
      engine: 'deepl',
      locale: interaction.locale,
    });

    const dismissRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`livethread_open:${channelId}:${messageId}:${targetLanguage}`)
        .setLabel(ui.liveThreadBtn)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('translate_dismiss')
        .setLabel(ui.dismiss)
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [dismissRow],
    });
  } catch (error: unknown) {
    console.error('DeepL translation button error:', error);
    const errMsg = error instanceof Error ? error.message : 'An error occurred';
    await interaction.followUp({
      content: errMsg,
      flags: MessageFlags.Ephemeral,
    });
  }
}

const dmPromptedUsers = new Set<string>();

client.on(Events.GuildCreate, async (guild) => {
  if (!client.isReady()) return;
  if (dbService.isGuildBroadcastDone(guild.id)) return;

  console.log(`Bot joined new guild ${guild.name} (${guild.id}). Starting setup broadcast...`);
  try {
    const stats = await runServerSetupBroadcast(guild);
    console.log(
      `Setup broadcast completed for guild ${guild.name} (${guild.id}): ` +
        `${stats.delivered} delivered, ${stats.closedDms} closed DMs, ${stats.alreadySetup} already setup.`
    );
  } catch (err) {
    console.error(`Error during setup broadcast for guild ${guild.id}:`, err);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;
  const prefs = dbService.getUserPreferences(member.id);
  if (!prefs.setup_completed && !dmPromptedUsers.has(member.id)) {
    dmPromptedUsers.add(member.id);
    const labels = await getDynamicSetupLabels(member.guild.preferredLocale);
    const { embed, components, files } = setupCommand.buildFirstUseIntercept(
      member.user.username,
      member.guild.preferredLocale,
      labels
    );
    await member.send({ embeds: [embed], components, files }).catch(() => {});
  }
});

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot || !message.guild) return;

  if (message.channel.isThread()) {
    const threadChannel = message.channel as ThreadChannel;
    const isTranslationThread =
      dbService.isLiveThread(threadChannel.id) ||
      threadChannel.name.startsWith('Translations ›') ||
      threadChannel.name.startsWith('Translations -');

    if (isTranslationThread) {
      await message.delete().catch(() => {});
      if (!threadChannel.locked) {
        await threadChannel.setLocked(true).catch(() => {});
      }
    }
    return;
  }

  if (!message.content || message.content.trim().length < 2) return;
  if (message.content.startsWith('/') || message.content.startsWith('!')) return;
  if (isPureMediaOrUrl(message.content)) return;

  const authorPrefs = dbService.getUserPreferences(message.author.id);
  if (!authorPrefs.setup_completed && !dmPromptedUsers.has(message.author.id)) {
    dmPromptedUsers.add(message.author.id);
    const serverLocale = message.guild.preferredLocale || 'en';
    const labels = await getDynamicSetupLabels(serverLocale);
    const { embed, components, files } = setupCommand.buildFirstUseIntercept(
      message.author.username,
      serverLocale,
      labels
    );
    await message.author.send({ embeds: [embed], components, files }).catch(() => {});
  }

  const subscribers = dbService.getAllAutoTranslateDmUsers();
  for (const subscriber of subscribers) {
    if (subscriber.discord_id === message.author.id) continue;

    try {
      const member =
        message.guild.members.cache.get(subscriber.discord_id) ||
        (await message.guild.members.fetch(subscriber.discord_id).catch(() => null));
      if (!member) continue;

      const channelPerms =
        'permissionsFor' in message.channel
          ? (message.channel as TextChannel).permissionsFor(member)
          : null;
      if (
        !channelPerms ||
        !channelPerms.has('ViewChannel') ||
        !channelPerms.has('ReadMessageHistory')
      ) {
        continue;
      }

      const translated = await translationService.translateWithGoogle(
        message.content,
        subscriber.target_language
      );

      if (translated.trim().toLowerCase() === message.content.trim().toLowerCase()) {
        continue;
      }

      const user = await client.users.fetch(subscriber.discord_id).catch(() => null);
      if (!user) continue;

      const channelName =
        'name' in message.channel ? (message.channel as { name: string }).name : 'chat';
      const embed = createLiveThreadMessageEmbed(
        message.author,
        translated,
        subscriber.target_language,
        channelName,
        message.content,
        subscriber.show_original === 1
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Jump to Message ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(message.url)
      );

      await user.send({ embeds: [embed], components: [row] }).catch(() => {});
    } catch (err) {
      console.error('Error sending auto-DM translation:', err);
    }
  }

  if (message.channel.type === ChannelType.GuildText) {
    const textChannel = message.channel as TextChannel;
    const guildSettings = dbService.getGuildSettings(message.guild.id);
    const threadsAllowed = guildSettings.allow_live_threads !== 'disabled';

    if (threadsAllowed) {
      const autoThreadUsers = dbService.getAllAutoTranslateThreadUsers();
      for (const autoUser of autoThreadUsers) {
        const existing = dbService.getUserLiveThread(autoUser.discord_id, message.guild.id);
        let activeThread: ThreadChannel | null = null;
        if (existing) {
          activeThread = (await client.channels
            .fetch(existing.thread_id)
            .catch(() => null)) as ThreadChannel | null;
          if (!activeThread || !activeThread.isThread()) {
            dbService.removeLiveThread(existing.thread_id);
            activeThread = null;
          }
        }

        if (!activeThread) {
          const member =
            message.guild.members.cache.get(autoUser.discord_id) ||
            (await message.guild.members.fetch(autoUser.discord_id).catch(() => null));
          if (member) {
            if (
              guildSettings.allow_live_threads !== 'admin_only' ||
              member.permissions.has('ManageGuild') ||
              member.permissions.has('Administrator')
            ) {
              await ensureLiveThread({
                channel: textChannel,
                user: member.user,
                targetLanguage: autoUser.target_language,
              }).catch(() => null);
            }
          }
        }
      }

      dbService.saveChannelMessage({
        id: message.id,
        guild_id: message.guild.id,
        channel_id: textChannel.id,
        channel_name: textChannel.name,
        author_name: message.author.displayName || message.author.username,
        author_avatar: message.author.displayAvatarURL({ size: 64 }),
        original_text: message.content,
        url: message.url,
        created_at: Math.floor(message.createdTimestamp / 1000),
      });

      const liveThreads = dbService.getLiveThreadsForGuild(message.guild.id);
      for (const lt of liveThreads) {
        if (lt.discord_id === message.author.id) continue;

        try {
          const member =
            message.guild.members.cache.get(lt.discord_id) ||
            (await message.guild.members.fetch(lt.discord_id).catch(() => null));
          if (!member) continue;

          if (guildSettings.allow_live_threads === 'admin_only') {
            const isStaff =
              member.permissions.has('ManageGuild') ||
              member.permissions.has('Administrator');
            if (!isStaff) continue;
          }

          const perms = textChannel.permissionsFor(member);
          if (
            !perms ||
            !perms.has('ViewChannel') ||
            !perms.has('ReadMessageHistory')
          ) {
            continue;
          }

          if (dbService.isChannelMuted(lt.discord_id, textChannel.id)) {
            continue;
          }

          const currentFocus = dbService.getThreadFocus(lt.thread_id);
          const isFocused = currentFocus === 'all' || currentFocus === textChannel.id;

          const prefs = dbService.getUserPreferences(lt.discord_id);
          const channelName = textChannel.name;
          const authorName = message.author.displayName || message.author.username;
          const authorAvatar = message.author.displayAvatarURL({ size: 64 });

          if (isFocused) {
            dbService.updateUserChannelRead(lt.discord_id, textChannel.id, Math.floor(Date.now() / 1000));
            enqueueThreadMessage({
              threadId: lt.thread_id,
              threadUserId: lt.discord_id,
              channelId: textChannel.id,
              channelName,
              targetLanguage: lt.target_language,
              showOriginal: prefs.show_original === 1,
              message: {
                id: message.id,
                content: message.content,
                authorId: message.author.id,
                authorName,
                authorAvatar,
                url: message.url,
              },
              client,
            });
          } else {
            await notifyThreadUnreadActivity(client, lt.thread_id, lt.discord_id, message.guild);
          }
        } catch (err) {
          console.error('Error queuing batched thread message:', err);
        }
      }
    }
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord Translation Bot is running.\n');
});
server.listen(port, () => {
  console.log(`Healthcheck server listening on port ${port}`);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is missing in .env file.');
  process.exit(1);
}

process.on('SIGTERM', async () => {
  await flushAllBatches(client);
  process.exit(0);
});

process.on('SIGINT', async () => {
  await flushAllBatches(client);
  process.exit(0);
});

client.login(token);
