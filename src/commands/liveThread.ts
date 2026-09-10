import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  CacheType,
  ChannelType,
  ThreadAutoArchiveDuration,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
  ThreadChannel,
  Guild,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { dbService } from '../db/database';
import { normalizeLanguageCode, searchLanguages, POPULAR_LANGUAGES } from '../utils/flags';

export const data = new SlashCommandBuilder()
  .setName('livethread')
  .setDescription('Manage your private real-time translation thread in this channel')
  .setDescriptionLocalizations({
    de: 'Verwalte deinen privaten Live-Übersetzungs-Thread in diesem Kanal',
    'es-ES': 'Gestiona tu hilo privado de traducción en tiempo real',
    fr: 'Gérer votre fil privé de traduction en temps réel',
    it: 'Gestisci il tuo thread privato di traduzione in tempo reale',
  })
  .addSubcommand((sub) =>
    sub
      .setName('start')
      .setDescription('Open a private thread that automatically translates messages in this channel')
      .setDescriptionLocalizations({
        de: 'Öffnet einen privaten Thread, der Kanalnachrichten automatisch übersetzt',
        'es-ES': 'Abre un hilo privado que traduce automáticamente los mensajes',
        fr: 'Ouvre un fil privé qui traduit automatiquement les messages',
        it: 'Apre un thread privato che traduce automaticamente i messaggi',
      })
      .addStringOption((opt) =>
        opt
          .setName('language')
          .setDescription('Target language for translations (defaults to your saved language)')
          .setDescriptionLocalizations({
            de: 'Zielsprache für Übersetzungen (Standard: deine gespeicherte Sprache)',
            'es-ES': 'Idioma destino para traducciones',
            fr: 'Langue cible pour les traductions',
            it: 'Lingua di destinazione per le traduzioni',
          })
          .setRequired(false)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('stop')
      .setDescription('Close and stop your private translation thread in this channel')
      .setDescriptionLocalizations({
        de: 'Schließt und beendet deinen privaten Übersetzungs-Thread',
        'es-ES': 'Cierra y detiene tu hilo privado de traducción',
        fr: 'Ferme et arrête votre fil privé de traduction',
        it: 'Chiude e arresta il tuo thread privato di traduzione',
      })
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  const choices = searchLanguages(focusedValue, interaction.locale);
  await interaction.respond(
    choices.map((choice) => ({
      name: `${choice.flag} ${choice.name} (${choice.code})`,
      value: choice.code,
    }))
  );
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const subcommand = interaction.options.getSubcommand();
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: 'Live translation threads can only be started in standard text channels.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const textChannel = channel as TextChannel;
  const userPrefs = dbService.getUserPreferences(interaction.user.id);

  if (subcommand === 'start') {
    if (interaction.guildId) {
      const guildSettings = dbService.getGuildSettings(interaction.guildId);
      if (guildSettings.allow_live_threads === 'disabled') {
        await interaction.reply({
          content: 'Live translation threads are disabled by server administrators to keep channels clean.',
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
            content:
              'Live translation threads are restricted to server staff to prevent channel flooding. Use right-click **Apps > Translate** for private translation.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requestedLang = interaction.options.getString('language');
    const targetLanguage = requestedLang
      ? normalizeLanguageCode(requestedLang)
      : userPrefs.target_language;

    const thread = await ensureLiveThread({
      channel: textChannel,
      user: interaction.user,
      targetLanguage,
    });

    if (!thread) {
      await interaction.editReply({
        content:
          'Could not create private thread. Please check that the bot has `Create Private Threads` and `Send Messages in Threads` permissions.',
      });
      return;
    }

    await interaction.editReply({
      content: `Your private live translation thread is ready: <#${thread.id}>\nClick the thread link to view real-time translations alongside the main chat!`,
    });
    return;
  }

  if (subcommand === 'stop') {
    const existing =
      dbService.getUserLiveThread(interaction.user.id, textChannel.guildId) ||
      dbService.getUserLiveThreadInChannel(interaction.user.id, textChannel.id);
    if (!existing) {
      await interaction.reply({
        content: 'You do not have an active live translation thread in this server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    dbService.removeLiveThread(existing.thread_id);

    try {
      const thread = (await textChannel.guild.channels
        .fetch(existing.thread_id)
        .catch(() => null)) as ThreadChannel | null;
      if (thread && thread.isThread()) {
        await thread.send('Live translation thread stopped by user. Archiving thread...').catch(() => {});
        await thread.setArchived(true).catch(() => {});
      }
    } catch (e) {
      console.warn('Could not archive thread on stop:', e);
    }

    await interaction.reply({
      content: 'Your live translation thread has been stopped and archived.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function ensureLiveThread(params: {
  channel: TextChannel;
  user: { id: string; username: string; tag?: string };
  targetLanguage: string;
}): Promise<ThreadChannel | null> {
  const { channel, user, targetLanguage } = params;

  const botMember =
    channel.guild.members.me ||
    (await channel.guild.members.fetchMe().catch(() => null));
  if (!botMember) return null;

  const perms = channel.permissionsFor(botMember);
  if (
    !perms ||
    !perms.has('ViewChannel') ||
    !perms.has('SendMessagesInThreads') ||
    !perms.has('CreatePrivateThreads')
  ) {
    return null;
  }

  const existing =
    dbService.getUserLiveThreadInChannel(user.id, channel.id) ||
    dbService.getUserLiveThread(user.id, channel.guildId);

  if (existing) {
    const existingThread = (await channel.guild.channels
      .fetch(existing.thread_id)
      .catch(() => null)) as ThreadChannel | null;

    if (existingThread && existingThread.isThread()) {
      if (existingThread.archived) {
        await existingThread.setArchived(false).catch(() => {});
      }
      await existingThread.members.add(user.id).catch(() => {});

      if (existing.target_language !== targetLanguage) {
        dbService.updateLiveThreadLanguage(existing.thread_id, targetLanguage);
        const langInfo =
          POPULAR_LANGUAGES.find((l) => l.code === targetLanguage) || {
            name: targetLanguage.toUpperCase(),
            flag: '🌐',
          };
        const updateEmbed = new EmbedBuilder()
          .setColor('#8B5CF6')
          .setTitle('Target Language Updated')
          .setDescription(
            `Your live translation feed has been updated to ${langInfo.flag} **${langInfo.name}** (\`${targetLanguage}\`). All incoming messages will now be translated into ${langInfo.name}.`
          )
          .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' });
        await existingThread.send({ embeds: [updateEmbed] }).catch(() => {});
      }

      return existingThread;
    }

    dbService.removeLiveThread(existing.thread_id);
  }

  const threadTargetName = `Translations › ${user.username}`;
  let discordExistingThread: ThreadChannel | null = null;

  const cachedThread = channel.threads.cache.find(
    (t) =>
      t.isThread() &&
      t.parentId === channel.id &&
      (t.name === threadTargetName || t.name === `Translations - ${user.username}`)
  );
  if (cachedThread) {
    discordExistingThread = cachedThread;
  }

  if (!discordExistingThread) {
    try {
      const active = await channel.threads.fetchActive();
      const matches = active.threads.filter(
        (t) => t.name === threadTargetName || t.name === `Translations - ${user.username}`
      );
      if (matches.size > 0) {
        discordExistingThread =
          matches.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0)).first() || null;
      }
    } catch (e) {
      console.warn('Could not fetch active threads from channel:', e);
    }
  }

  if (!discordExistingThread) {
    try {
      const archived = await channel.threads.fetchArchived({ type: 'private', fetchAll: false });
      const matches = archived.threads.filter(
        (t) => t.name === threadTargetName || t.name === `Translations - ${user.username}`
      );
      if (matches.size > 0) {
        discordExistingThread =
          matches.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0)).first() || null;
      }
    } catch (e) {
      console.warn('Could not fetch archived private threads from channel:', e);
    }
  }

  if (discordExistingThread) {
    if (discordExistingThread.archived) {
      await discordExistingThread.setArchived(false).catch(() => {});
    }
    await discordExistingThread.members.add(user.id).catch(() => {});

    dbService.registerLiveThread(
      user.id,
      channel.guildId,
      channel.id,
      discordExistingThread.id,
      targetLanguage
    );

    return discordExistingThread;
  }

  const langInfo =
    POPULAR_LANGUAGES.find((l) => l.code === targetLanguage) || {
      name: targetLanguage.toUpperCase(),
      flag: '🌐',
    };

  try {
    const thread = await channel.threads.create({
      name: threadTargetName,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      type: ChannelType.PrivateThread,
      reason: `Private live translation thread for ${user.username}`,
    });

    await thread.members.add(user.id).catch(() => {});

    dbService.registerLiveThread(
      user.id,
      channel.guildId,
      channel.id,
      thread.id,
      targetLanguage
    );

    const welcomeEmbed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setTitle('Live Translation Thread')
      .setDescription(
        `Any messages sent in <#${channel.id}> in other languages will be automatically translated and posted here in real time.`
      )
      .addFields(
        {
          name: 'Target Language',
          value: `${langInfo.flag} **${langInfo.name}** (\`${targetLanguage}\`)`,
          inline: true,
        },
        {
          name: 'Privacy Notice',
          value:
            'This private thread is visible **only to you and the bot**. Other server members cannot see it.',
          inline: true,
        },
        {
          name: 'Stop Feed',
          value: 'Click "Stop Feed" below anytime to close this thread.',
          inline: false,
        }
      )
      .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' });

    const stopRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`livethread_stop:${thread.id}`)
        .setLabel('Stop Feed')
        .setStyle(ButtonStyle.Danger)
    );

    await thread.send({ embeds: [welcomeEmbed], components: [stopRow] });
    return thread;
  } catch (err) {
    console.error('Failed to create private live thread:', err);
    return null;
  }
}

export async function syncUserLiveThreadLanguage(
  guild: Guild,
  userId: string,
  newLanguage: string
): Promise<void> {
  const existing =
    dbService.getUserLiveThread(userId, guild.id) ||
    dbService.getUserLiveThread(userId);
  if (!existing) return;

  dbService.updateLiveThreadLanguage(existing.thread_id, newLanguage);

  try {
    const thread = (await guild.channels
      .fetch(existing.thread_id)
      .catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      if (thread.archived) {
        await thread.setArchived(false).catch(() => {});
      }
      const langInfo =
        POPULAR_LANGUAGES.find((l) => l.code === newLanguage) || {
          name: newLanguage.toUpperCase(),
          flag: '🌐',
        };
      const updateEmbed = new EmbedBuilder()
        .setColor('#8B5CF6')
        .setTitle('Target Language Updated')
        .setDescription(
          `Your live translation feed has been updated to ${langInfo.flag} **${langInfo.name}** (\`${newLanguage}\`). All incoming messages will now be translated into ${langInfo.name}.`
        )
        .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' });
      await thread.send({ embeds: [updateEmbed] }).catch(() => {});
    }
  } catch (err) {
    console.error('Error syncing live thread language on change:', err);
  }
}
