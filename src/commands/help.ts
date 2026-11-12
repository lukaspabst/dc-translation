import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { getDynamicHelpLabels } from '../services/uiTranslator';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows how to use the translation bot')
  .setDescriptionLocalizations({
    de: 'Zeigt eine Anleitung zur Verwendung des Übersetzungs-Bots',
    'es-ES': 'Muestra cómo usar el bot de traducción',
    fr: 'Affiche le guide d utilisation du bot de traduction',
    it: 'Mostra la guida all uso del bot di traduzione',
  });

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const labels = await getDynamicHelpLabels(interaction.locale);
  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.title)
    .setDescription(labels.desc)
    .addFields(
      {
        name: labels.sectionPrivate,
        value: labels.sectionPrivateBody,
      },
      {
        name: labels.sectionFlags,
        value: labels.sectionFlagsBody,
      },
      {
        name: labels.sectionDirect,
        value: labels.sectionDirectBody,
      },
      {
        name: labels.sectionPrefs,
        value: labels.sectionPrefsBody,
      },
      {
        name: labels.sectionServer,
        value: labels.sectionServerBody,
      }
    )
    .setFooter({ text: 'Powered by Google Cloud Translation & DeepL' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_open_from_help')
      .setLabel(labels.openSettingsBtn)
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}
