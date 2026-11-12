import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { dbService, UserPreferences } from '../db/database';
import {
  POPULAR_LANGUAGES,
  ALL_SUPPORTED_LANGUAGES,
  getLocalizedLanguageName,
  getEffectiveLanguage,
} from '../utils/flags';
import { getSettingsLabels, SettingsLabels } from '../utils/locales';
import { getDynamicSettingsLabels } from '../services/uiTranslator';

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Manage your personal translation preferences')
  .setDescriptionLocalizations({
    de: 'Verwalte deine persönlichen Übersetzungseinstellungen',
    'es-ES': 'Gestiona tus preferencias personales de traducción',
    fr: 'Gérer vos préférences personnelles de traduction',
    it: 'Gestisci le tue preferenze personali di traduzione',
  });

export function buildSettingsEmbed(
  prefs: UserPreferences,
  locale?: string,
  customLabels?: SettingsLabels
): EmbedBuilder {
  const labels = customLabels || getSettingsLabels(locale);
  const currentLang = {
    name: getLocalizedLanguageName(prefs.target_language, locale),
  };

  const durationLabel =
    prefs.flag_duration === 0
      ? labels.durationPermanent
      : labels.durationMinutes(prefs.flag_duration);

  let currentDeliveryName = labels.modeManual;
  let currentDeliveryDesc = labels.modeManualDesc;
  if (prefs.auto_translate_thread) {
    currentDeliveryName = labels.modeThread;
    currentDeliveryDesc = labels.modeThreadDesc;
  } else if (prefs.auto_translate_dm) {
    currentDeliveryName = labels.modeDm;
    currentDeliveryDesc = labels.modeDmDesc;
  }

  const engineLabel =
    prefs.preferred_engine === 'deepl' ? labels.engineDeepl : labels.engineGoogle;

  return new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.title)
    .setDescription(labels.desc)
    .addFields(
      {
        name: labels.targetLang,
        value: `**${currentLang.name}** (\`${prefs.target_language}\`)\n*${labels.targetLangDesc}*`,
        inline: false,
      },
      {
        name: labels.deliveryMode,
        value: `**${currentDeliveryName}**\n*${currentDeliveryDesc}*`,
        inline: false,
      },
      {
        name: labels.showOriginal,
        value: `\`${prefs.show_original ? labels.enabled : labels.disabled}\` — *${labels.showOriginalDesc}*`,
        inline: false,
      },
      {
        name: labels.autoDelete,
        value: `\`${durationLabel}\` — *${labels.autoDeleteDesc}*`,
        inline: false,
      },
      {
        name: labels.defaultEngine,
        value: `\`${engineLabel}\` — *${labels.defaultEngineDesc}*`,
        inline: false,
      }
    )
    .setFooter({ text: labels.footer });
}

export function buildSettingsComponents(
  prefs: UserPreferences,
  locale?: string,
  customLabels?: SettingsLabels
): [
  ActionRowBuilder<StringSelectMenuBuilder>,
  ActionRowBuilder<StringSelectMenuBuilder>,
  ActionRowBuilder<ButtonBuilder>,
  ActionRowBuilder<ButtonBuilder>
] {
  const labels = customLabels || getSettingsLabels(locale);
  const currentLangName = getLocalizedLanguageName(prefs.target_language, locale);

  const langSelect = new StringSelectMenuBuilder()
    .setCustomId('settings_select_lang')
    .setPlaceholder(`${currentLangName} (${prefs.target_language}) — Click here to change`)
    .addOptions(
      POPULAR_LANGUAGES.slice(0, 25).map((l) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${getLocalizedLanguageName(l.code, locale)} (${l.code})`)
          .setValue(l.code)
          .setDefault(l.code === prefs.target_language)
      )
    );

  const durationSelect = new StringSelectMenuBuilder()
    .setCustomId('settings_select_duration')
    .setPlaceholder(labels.durationPlaceholder)
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel(`${labels.durationMinutes(3)} (Default)`)
        .setValue('3')
        .setDefault(prefs.flag_duration === 3),
      new StringSelectMenuOptionBuilder()
        .setLabel(labels.durationMinutes(1))
        .setValue('1')
        .setDefault(prefs.flag_duration === 1),
      new StringSelectMenuOptionBuilder()
        .setLabel(labels.durationMinutes(5))
        .setValue('5')
        .setDefault(prefs.flag_duration === 5),
      new StringSelectMenuOptionBuilder()
        .setLabel(labels.durationMinutes(15))
        .setValue('15')
        .setDefault(prefs.flag_duration === 15),
      new StringSelectMenuOptionBuilder()
        .setLabel(labels.durationMinutes(60))
        .setValue('60')
        .setDefault(prefs.flag_duration === 60),
      new StringSelectMenuOptionBuilder()
        .setLabel(labels.durationPermanent)
        .setValue('0')
        .setDefault(prefs.flag_duration === 0),
    ]);

  const deliveryButtonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_mode:thread')
      .setLabel(labels.btnModeThread)
      .setStyle(prefs.auto_translate_thread ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('settings_mode:dm')
      .setLabel(labels.btnModeDm)
      .setStyle(prefs.auto_translate_dm ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('settings_mode:manual')
      .setLabel(labels.btnModeManual)
      .setStyle(
        !prefs.auto_translate_thread && !prefs.auto_translate_dm
          ? ButtonStyle.Success
          : ButtonStyle.Secondary
      )
  );

  const preferenceButtonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_toggle_original')
      .setLabel(labels.toggleOriginal(prefs.show_original === 1))
      .setStyle(prefs.show_original ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('settings_toggle_engine')
      .setLabel(labels.toggleEngine(prefs.preferred_engine === 'deepl'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('translate_dismiss')
      .setLabel(labels.dismissBtn)
      .setStyle(ButtonStyle.Secondary)
  );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(langSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(durationSelect),
    deliveryButtonsRow,
    preferenceButtonsRow,
  ];
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const prefs = dbService.getUserPreferences(interaction.user.id);
  const effectiveLang = getEffectiveLanguage(prefs.target_language, interaction.locale);
  const labels = await getDynamicSettingsLabels(effectiveLang);
  const embed = buildSettingsEmbed(prefs, effectiveLang, labels);
  const [row1, row2, row3, row4] = buildSettingsComponents(prefs, effectiveLang, labels);

  await interaction.reply({
    embeds: [embed],
    components: [row1, row2, row3, row4],
    flags: MessageFlags.Ephemeral,
  });
}
