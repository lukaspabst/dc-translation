import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
  Guild,
  GuildMember,
} from 'discord.js';
import { dbService } from '../db/database';
import { buildFirstUseIntercept } from './setup';
import { getDynamicSetupLabels } from '../services/uiTranslator';

export const data = new SlashCommandBuilder()
  .setName('broadcast-setup')
  .setDescription('Broadcast the translation setup prompt to all existing server members via DM')
  .setDescriptionLocalizations({
    de: 'Sende die Translation-Einrichtung per DM an alle bestehenden Servermitglieder',
    'es-ES': 'Enviar la configuración de traducción por MD a todos los miembros del servidor',
    fr: 'Envoyer la configuration de traduction par MP à tous les membres du serveur',
    it: 'Invia la configurazione di traduzione via MD a tutti i membri del server',
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export interface BroadcastStats {
  totalMembers: number;
  scanned: number;
  delivered: number;
  skippedBots: number;
  alreadySetup: number;
  closedDms: number;
  missingAccess: number;
  unknownUser: number;
  rateLimitRetries: number;
  otherErrors: number;
  startTime: number;
  endTime?: number;
}

const activeBroadcastGuilds = new Set<string>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runServerSetupBroadcast(
  guild: Guild,
  onProgress?: (stats: BroadcastStats) => Promise<void>
): Promise<BroadcastStats> {
  if (activeBroadcastGuilds.has(guild.id)) {
    throw new Error('A setup broadcast is already in progress on this server.');
  }

  activeBroadcastGuilds.add(guild.id);

  const stats: BroadcastStats = {
    totalMembers: 0,
    scanned: 0,
    delivered: 0,
    skippedBots: 0,
    alreadySetup: 0,
    closedDms: 0,
    missingAccess: 0,
    unknownUser: 0,
    rateLimitRetries: 0,
    otherErrors: 0,
    startTime: Date.now(),
  };

  try {
    const fetchedMembers = await guild.members.fetch();
    const membersList: GuildMember[] = Array.from(fetchedMembers.values());
    stats.totalMembers = membersList.length;

    const serverLocale = guild.preferredLocale || 'en';
    const labels = await getDynamicSetupLabels(serverLocale);

    for (let i = 0; i < membersList.length; i++) {
      const member = membersList[i];
      stats.scanned++;

      if (member.user.bot) {
        stats.skippedBots++;
        continue;
      }

      const prefs = dbService.getUserPreferences(member.id);
      if (prefs.setup_completed) {
        stats.alreadySetup++;
        continue;
      }

      let deliveredThisUser = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!deliveredThisUser && attempts < maxAttempts) {
        attempts++;
        try {
          const { embed, components, files } = buildFirstUseIntercept(
            member.user.username,
            serverLocale,
            labels
          );

          await member.send({ embeds: [embed], components, files });
          stats.delivered++;
          deliveredThisUser = true;
        } catch (err: unknown) {
          const errorObj = err as { code?: number; status?: number; retryAfter?: number };
          const code = errorObj.code;
          const status = errorObj.status;

          if (code === 50007) {
            stats.closedDms++;
            break;
          } else if (code === 50001) {
            stats.missingAccess++;
            break;
          } else if (code === 10013) {
            stats.unknownUser++;
            break;
          } else if (status === 429 || code === 429) {
            stats.rateLimitRetries++;
            const retryAfterMs = typeof errorObj.retryAfter === 'number' ? errorObj.retryAfter : 5000;
            await sleep(retryAfterMs + 500);
          } else {
            if (attempts >= maxAttempts) {
              stats.otherErrors++;
            } else {
              await sleep(1500);
            }
          }
        }
      }

      if (onProgress && (stats.scanned % 5 === 0 || stats.scanned === stats.totalMembers)) {
        await onProgress(stats).catch(() => {});
      }

      await sleep(2500);
    }

    await dbService.setGuildBroadcastDone(guild.id, true);
  } finally {
    stats.endTime = Date.now();
    activeBroadcastGuilds.delete(guild.id);
  }

  return stats;
}

export function buildBroadcastProgressEmbed(stats: BroadcastStats, isComplete: boolean): EmbedBuilder {
  const percent = stats.totalMembers > 0 ? Math.round((stats.scanned / stats.totalMembers) * 100) : 0;
  const elapsedSec = Math.round(((stats.endTime || Date.now()) - stats.startTime) / 1000);

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(isComplete ? 'Setup Broadcast Complete' : 'Setup Broadcast in Progress')
    .setDescription(
      isComplete
        ? `Finished dispatching setup prompts to members in **${elapsedSec}s**.\n\n• Progress: 100% (${stats.scanned}/${stats.totalMembers} scanned)`
        : `Dispatching setup prompts with 2.5s pacing to respect Discord limits.\n\n• Progress: **${percent}%** (${stats.scanned}/${stats.totalMembers} scanned)\n• Elapsed: **${elapsedSec}s**`
    )
    .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' })
    .addFields(
      {
        name: 'Delivered',
        value: `${stats.delivered}`,
        inline: true,
      },
      {
        name: 'Already Setup',
        value: `${stats.alreadySetup}`,
        inline: true,
      },
      {
        name: 'Bots Skipped',
        value: `${stats.skippedBots}`,
        inline: true,
      },
      {
        name: 'DMs Closed (50007)',
        value: `${stats.closedDms}`,
        inline: true,
      },
      {
        name: 'Missing Access (50001)',
        value: `${stats.missingAccess}`,
        inline: true,
      },
      {
        name: 'Other Errors',
        value: `${stats.otherErrors + stats.unknownUser}`,
        inline: true,
      }
    );

  return embed;
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: 'This command can only be used within a Discord server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const isAdmin =
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.guild.ownerId === interaction.user.id;

  if (!isAdmin) {
    await interaction.reply({
      content: 'Access denied: Only Server Administrators can trigger setup broadcasts.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (activeBroadcastGuilds.has(interaction.guild.id)) {
    await interaction.reply({
      content: 'A setup broadcast is already actively running on this server. Please wait until it finishes.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const initialEmbed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle('Initializing Setup Broadcast...')
    .setDescription('Fetching server members and preparing queued dispatch...')
    .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' });

  await interaction.editReply({ embeds: [initialEmbed] });

  let lastUpdate = 0;
  const onProgress = async (stats: BroadcastStats) => {
    const now = Date.now();
    if (now - lastUpdate > 3000 || stats.scanned === stats.totalMembers) {
      lastUpdate = now;
      const progressEmbed = buildBroadcastProgressEmbed(stats, false);
      await interaction.editReply({ embeds: [progressEmbed] }).catch(() => {});
    }
  };

  try {
    const stats = await runServerSetupBroadcast(interaction.guild, onProgress);
    const finalEmbed = buildBroadcastProgressEmbed(stats, true);
    await interaction.editReply({ embeds: [finalEmbed] });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await interaction.editReply({
      content: `Setup broadcast stopped: ${errorMsg}`,
      embeds: [],
    });
  }
}
