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
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { dbService } from '../db/database';
import {
  addGuildSubscriber,
  removeGuildSubscriber,
  removeUserGuildThread,
} from '../db/redis';
import {
  ensureUserGuildThread,
  buildLiveThreadControlComponents,
} from '../services/threadManager';
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
      name: `${choice.name} (${choice.code})`,
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

    const thread = await ensureUserGuildThread({
      guild: textChannel.guild,
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

    await addGuildSubscriber(textChannel.guildId, interaction.user.id);

    await interaction.editReply({
      content: `Your private live translation thread is ready: <#${thread.id}>\nClick the thread link to view real-time translations from all channels!`,
    });
    return;
  }

  if (subcommand === 'stop') {
    await removeGuildSubscriber(textChannel.guildId, interaction.user.id);
    await removeUserGuildThread(textChannel.guildId, interaction.user.id);

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
        await thread.send('Live translation feed stopped by user. Archiving thread...').catch(() => {});
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

export { buildLiveThreadControlComponents, ensureUserGuildThread };
export const ensureLiveThread = ensureUserGuildThread;

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
        };
      const updateEmbed = new EmbedBuilder()
        .setColor('#8B5CF6')
        .setTitle('Target Language Updated')
        .setDescription(
          `Your live translation feed has been updated to **${langInfo.name}** (\`${newLanguage}\`). All incoming messages will now be translated into ${langInfo.name}.`
        )
        .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' });
      await thread.send({ embeds: [updateEmbed] }).catch(() => {});
    }
  } catch (err) {
    console.error('Error syncing live thread language on change:', err);
  }
}
