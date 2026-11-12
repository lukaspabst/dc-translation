import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { dbService, GuildSettings, PermissionScope } from '../db/database';
import { getServerLabels, ServerLabels } from '../utils/locales';
import { getDynamicServerLabels } from '../services/uiTranslator';

export const data = new SlashCommandBuilder()
  .setName('server-settings')
  .setDescription('Configure server-wide translation permissions and anti-flood guardrails')
  .setDescriptionLocalizations({
    de: 'Konfiguriere serverweite Übersetzungsrechte und Schutz vor Kanal-Flutung',
    'es-ES': 'Configura permisos de traducción y reglas contra saturación del servidor',
    fr: 'Configurer les autorisations de traduction et les règles anti-flood',
    it: 'Configura i permessi di traduzione e i controlli anti-spam per il server',
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export function buildServerSettingsEmbed(
  settings: GuildSettings,
  locale?: string,
  customLabels?: ServerLabels
): EmbedBuilder {
  const labels = customLabels || getServerLabels(locale);
  const threadsLabel =
    settings.allow_live_threads === 'disabled'
      ? labels.threadsDisabled
      : settings.allow_live_threads === 'admin_only'
      ? labels.threadsAdminsOnly
      : labels.threadsEveryone;

  const publicLabel =
    settings.allow_public_translations === 'disabled'
      ? labels.publicDisabled
      : settings.allow_public_translations === 'admin_only'
      ? labels.publicAdminsOnly
      : labels.publicEveryone;

  const flagsLabel = settings.flag_channel_reply_allowed
    ? labels.flagsChannelAllowed
    : (labels.flagsDisabled || labels.flagsDmsOnly || 'Disabled');

  return new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.title)
    .setDescription(labels.desc)
    .addFields(
      {
        name: labels.threadsField,
        value: `\`${threadsLabel}\`\n*${labels.threadsExplain}*`,
        inline: false,
      },
      {
        name: labels.publicField,
        value: `\`${publicLabel}\`\n*${labels.publicExplain}*`,
        inline: false,
      },
      {
        name: labels.flagsField,
        value: `\`${flagsLabel}\`\n*${labels.flagsExplain}*`,
        inline: false,
      }
    )
    .setFooter({ text: labels.footer });
}

export function buildServerSettingsComponents(
  settings: GuildSettings,
  locale?: string,
  customLabels?: ServerLabels
): [ActionRowBuilder<ButtonBuilder>, ActionRowBuilder<ButtonBuilder>] {
  const labels = customLabels || getServerLabels(locale);
  const nextThreads: PermissionScope =
    settings.allow_live_threads === 'admin_only'
      ? 'disabled'
      : settings.allow_live_threads === 'disabled'
      ? 'everyone'
      : 'admin_only';

  const nextPublic: PermissionScope =
    settings.allow_public_translations === 'admin_only'
      ? 'disabled'
      : settings.allow_public_translations === 'disabled'
      ? 'everyone'
      : 'admin_only';

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`server_toggle_threads:${nextThreads}`)
      .setLabel(labels.threadsBtnLabel(settings.allow_live_threads))
      .setStyle(
        settings.allow_live_threads === 'disabled'
          ? ButtonStyle.Danger
          : settings.allow_live_threads === 'admin_only'
          ? ButtonStyle.Primary
          : ButtonStyle.Secondary
      ),
    new ButtonBuilder()
      .setCustomId(`server_toggle_public:${nextPublic}`)
      .setLabel(labels.publicBtnLabel(settings.allow_public_translations))
      .setStyle(
        settings.allow_public_translations === 'disabled'
          ? ButtonStyle.Danger
          : settings.allow_public_translations === 'admin_only'
          ? ButtonStyle.Primary
          : ButtonStyle.Secondary
      ),
    new ButtonBuilder()
      .setCustomId('server_toggle_flags')
      .setLabel(labels.flagsBtnLabel(settings.flag_channel_reply_allowed))
      .setStyle(settings.flag_channel_reply_allowed ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('translate_dismiss')
      .setLabel(labels.dismissBtn)
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'This command can only be used inside a Discord server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = dbService.getGuildSettings(interaction.guildId);
  const labels = await getDynamicServerLabels(interaction.locale);
  const embed = buildServerSettingsEmbed(settings, interaction.locale, labels);
  const [row1, row2] = buildServerSettingsComponents(settings, interaction.locale, labels);

  await interaction.reply({
    embeds: [embed],
    components: [row1, row2],
    flags: MessageFlags.Ephemeral,
  });
}
