import {
  AttachmentBuilder,
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
import * as path from 'path';
import * as fs from 'fs';
import { dbService, UserPreferences, GuildSettings } from '../db/database';
import {
  POPULAR_LANGUAGES,
  ALL_SUPPORTED_LANGUAGES,
  mapDiscordLocaleToLanguage,
  getLocalizedLanguageName,
  getLanguagePage,
  LanguageChoice,
} from '../utils/flags';
import { getSetupLabels, SetupLabels } from '../utils/locales';
import { getDynamicSetupLabels } from '../services/uiTranslator';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Interactive step-by-step setup wizard for your personal translation preferences')
  .setDescriptionLocalizations({
    de: 'Interaktiver Schritt-für-Schritt Einrichtungs-Assistent für deine Übersetzungen',
    'es-ES': 'Asistente interactivo paso a paso para configurar tus preferencias de traducción',
    fr: 'Assistant interactif étape par étape pour vos préférences de traduction',
    it: 'Configurazione guidata interattiva passo-passo per le tue preferenze di traduzione',
  });

function getLanguageInfo(
  code: string,
  locale?: string
): { code: string; name: string; flag: string } {
  const match = ALL_SUPPORTED_LANGUAGES.find((l) => l.code === code);
  const localizedName = getLocalizedLanguageName(code, locale);
  const flag = match?.flag || '🌐';
  return { code, name: localizedName, flag };
}

export function buildStep1(
  prefs: UserPreferences,
  locale?: string,
  customLabels?: SetupLabels,
  options?: {
    page?: number;
    searchQuery?: string;
    searchResults?: readonly LanguageChoice[];
    searchNotice?: string;
  }
): {
  embed: EmbedBuilder;
  components: [
    ActionRowBuilder<StringSelectMenuBuilder>,
    ActionRowBuilder<ButtonBuilder>
  ];
} {
  const labels = customLabels || getSetupLabels(locale);
  const detectedCode = mapDiscordLocaleToLanguage(locale);
  const currentLang = getLanguageInfo(prefs.target_language, locale);
  const detectedLang = getLanguageInfo(detectedCode, locale);

  const isSearch = Boolean(options?.searchQuery && options?.searchResults);
  const displayedLanguages: readonly LanguageChoice[] =
    options?.searchResults && options.searchResults.length > 0
      ? options.searchResults
      : POPULAR_LANGUAGES.map((lang) => ({
          code: lang.code,
          name: getLocalizedLanguageName(lang.code, locale),
          flag: lang.flag,
        }));

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.step1Title)
    .setDescription(labels.step1Desc)
    .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' })
    .addFields(
      {
        name: labels.currentSelection,
        value: `${currentLang.flag} **${currentLang.name}** (\`${currentLang.code}\`)`,
        inline: true,
      },
      {
        name: labels.detectedLocale,
        value: `${detectedLang.flag} **${detectedLang.name}** (\`${detectedLang.code}\`)`,
        inline: true,
      }
    );

  if (options?.searchNotice) {
    embed.addFields({
      name: labels.searchBtn,
      value: options.searchNotice,
      inline: false,
    });
  } else if (isSearch && options?.searchQuery) {
    embed.addFields({
      name: labels.searchBtn,
      value: `${displayedLanguages.length} matches ("${options.searchQuery}")`,
      inline: false,
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('setup_select_lang')
    .setPlaceholder(labels.selectPlaceholder)
    .addOptions(
      displayedLanguages.slice(0, 25).map((l) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${l.name} (${l.code})`)
          .setValue(l.code)
          .setEmoji(l.flag)
          .setDefault(l.code === prefs.target_language)
      )
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const actionRow = new ActionRowBuilder<ButtonBuilder>();
  if (isSearch) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId('setup_reset_search')
        .setLabel(labels.resetSearchBtn)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  actionRow.addComponents(
    new ButtonBuilder()
      .setCustomId('setup_open_search_modal')
      .setLabel(labels.searchBtn)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup_step:2')
      .setLabel(labels.nextDelivery)
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [selectRow, actionRow] };
}

export function buildStep2(
  prefs: UserPreferences,
  guildSettings?: GuildSettings | null,
  locale?: string,
  customLabels?: SetupLabels
): {
  embed: EmbedBuilder;
  components: [ActionRowBuilder<ButtonBuilder>, ActionRowBuilder<ButtonBuilder>];
} {
  const labels = customLabels || getSetupLabels(locale);
  const currentLang = getLanguageInfo(prefs.target_language, locale);

  const isThread = prefs.auto_translate_thread;
  const isDm = prefs.auto_translate_dm;
  const isManual = !isThread && !isDm;

  const threadAllowed = guildSettings?.allow_live_threads !== 'disabled';

  const threadPolicyNotice =
    guildSettings?.allow_live_threads === 'disabled'
      ? labels.threadDisabled
      : guildSettings?.allow_live_threads === 'admin_only'
      ? labels.threadStaffOnly
      : labels.threadAvailable;

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.step2Title)
    .setDescription(labels.step2Desc)
    .addFields(
      {
        name: labels.threadName,
        value: `${labels.threadDesc}\n*${threadPolicyNotice}*`,
        inline: false,
      },
      {
        name: labels.dmName,
        value: labels.dmDesc,
        inline: false,
      },
      {
        name: labels.ephemeralName,
        value: labels.ephemeralDesc,
        inline: false,
      },
      {
        name: labels.targetLangField,
        value: `${currentLang.flag} **${currentLang.name}** (\`${currentLang.code}\`)`,
        inline: true,
      }
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_mode:thread')
      .setLabel(labels.threadBtn)
      .setStyle(isThread ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!threadAllowed),
    new ButtonBuilder()
      .setCustomId('setup_mode:dm')
      .setLabel(labels.dmName.split(' (')[0])
      .setStyle(isDm ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup_mode:ephemeral')
      .setLabel(labels.ephemeralName.split(' (')[0])
      .setStyle(isManual ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_step:1')
      .setLabel(labels.backLang)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup_step:3')
      .setLabel(labels.nextPrefs)
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [row1, row2] };
}

export function buildStep3(
  prefs: UserPreferences,
  locale?: string,
  customLabels?: SetupLabels
): {
  embed: EmbedBuilder;
  components: [ActionRowBuilder<ButtonBuilder>, ActionRowBuilder<ButtonBuilder>];
} {
  const labels = customLabels || getSetupLabels(locale);
  const currentLang = getLanguageInfo(prefs.target_language, locale);
  const engineLabel =
    prefs.preferred_engine === 'deepl' ? 'DeepL' : 'Google Cloud';
  const modeLabel = prefs.auto_translate_thread
    ? labels.threadName.split(' (')[0]
    : prefs.auto_translate_dm
    ? labels.dmName.split(' (')[0]
    : labels.ephemeralName.split(' (')[0];

  const durationLabel =
    prefs.flag_duration === 0 ? 'Permanent' : `${prefs.flag_duration} min`;

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.step3Title)
    .setDescription(labels.step3Desc)
    .addFields(
      {
        name: labels.targetLangField,
        value: `${currentLang.flag} **${currentLang.name}** (\`${currentLang.code}\`)`,
        inline: true,
      },
      {
        name: labels.deliveryField,
        value: `**${modeLabel}**`,
        inline: true,
      },
      {
        name: labels.showOriginalField,
        value: `\`${prefs.show_original ? labels.enabled : labels.disabled}\`\n*${labels.showOriginalDesc}*`,
        inline: false,
      },
      {
        name: labels.autoDeleteField,
        value: `\`${durationLabel}\`\n*${labels.autoDeleteDesc}*`,
        inline: false,
      },
      {
        name: labels.engineField,
        value: `\`${engineLabel}\`\n*${labels.engineDesc}*`,
        inline: false,
      }
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_toggle_original')
      .setLabel(labels.originalToggle(prefs.show_original === 1))
      .setStyle(prefs.show_original ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup_toggle_engine')
      .setLabel(labels.engineToggle(prefs.preferred_engine === 'deepl'))
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_step:2')
      .setLabel(labels.backDelivery)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup_finish')
      .setLabel(labels.completeBtn)
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [row1, row2] };
}

export function buildCompletion(
  prefs: UserPreferences,
  locale?: string,
  customLabels?: SetupLabels
): {
  embed: EmbedBuilder;
  components: [ActionRowBuilder<ButtonBuilder>];
} {
  const labels = customLabels || getSetupLabels(locale);
  const currentLang = getLanguageInfo(prefs.target_language, locale);
  const engineLabel =
    prefs.preferred_engine === 'deepl' ? 'DeepL' : 'Google Cloud';
  const modeLabel = prefs.auto_translate_thread
    ? labels.threadName.split(' (')[0]
    : prefs.auto_translate_dm
    ? labels.dmName.split(' (')[0]
    : labels.ephemeralName.split(' (')[0];

  const durationLabel =
    prefs.flag_duration === 0 ? 'Permanent' : `${prefs.flag_duration} min`;

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.completionTitle)
    .setDescription(labels.completionDesc)
    .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' })
    .addFields(
      {
        name: labels.targetLangField,
        value: `${currentLang.flag} **${currentLang.name}** (\`${currentLang.code}\`)`,
        inline: true,
      },
      {
        name: labels.deliveryField,
        value: `\`${modeLabel}\``,
        inline: true,
      },
      {
        name: labels.engineField,
        value: `\`${engineLabel}\``,
        inline: true,
      },
      {
        name: labels.showOriginalField,
        value: `\`${prefs.show_original ? labels.enabled : labels.disabled}\``,
        inline: true,
      },
      {
        name: labels.autoDeleteField,
        value: `\`${durationLabel}\``,
        inline: true,
      },
      {
        name: labels.quickTipsTitle,
        value: labels.quickTipsContent,
        inline: false,
      }
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_open_from_help')
      .setLabel(labels.openSettingsBtn)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('translate_dismiss')
      .setLabel('Done')
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [row] };
}

export function buildFirstUseIntercept(
  userTag: string,
  locale?: string,
  customLabels?: SetupLabels
): {
  embed: EmbedBuilder;
  components: [ActionRowBuilder<ButtonBuilder>];
  files?: AttachmentBuilder[];
} {
  const labels = customLabels || getSetupLabels(locale);

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.interceptTitle)
    .setDescription(labels.interceptDesc(userTag))
    .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' })
    .addFields({
      name: labels.interceptPresetTitle,
      value: labels.interceptPresetBody,
      inline: false,
    });

  const files: AttachmentBuilder[] = [];
  const rimuruPath = path.resolve(__dirname, '../../assets/rimuru.gif');
  if (fs.existsSync(rimuruPath)) {
    const attachment = new AttachmentBuilder(rimuruPath, { name: 'rimuru.gif' });
    embed.setImage('attachment://rimuru.gif');
    files.push(attachment);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_detect_client')
      .setLabel(labels.detectClientBtn)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup_step:1')
      .setLabel(labels.manualChooseBtn)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('translate_dismiss')
      .setLabel(labels.cancelBtn)
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row], files };
}

export function buildClientDetectedPrompt(
  userTag: string,
  clientLangCode: string,
  locale?: string,
  customLabels?: SetupLabels
): {
  embed: EmbedBuilder;
  components: [ActionRowBuilder<ButtonBuilder>];
  files?: AttachmentBuilder[];
} {
  const labels = customLabels || getSetupLabels(locale);
  const clientLang = getLanguageInfo(clientLangCode, locale);

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle(labels.clientDetectedTitle)
    .setDescription(labels.clientDetectedDesc(clientLang.name, clientLang.code))
    .setFooter({ text: 'Done by your R4 Rimuru • For feedback feel free to msg me' })
    .addFields({
      name: labels.clientDetectedPreset,
      value: labels.clientDetectedPresetBody,
      inline: false,
    });

  const files: AttachmentBuilder[] = [];
  const rimuruPath = path.resolve(__dirname, '../../assets/rimuru.gif');
  if (fs.existsSync(rimuruPath)) {
    const attachment = new AttachmentBuilder(rimuruPath, { name: 'rimuru.gif' });
    embed.setImage('attachment://rimuru.gif');
    files.push(attachment);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_step:2:${clientLang.code}`)
      .setLabel(labels.useClientLangBtn(clientLang.name))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup_step:1')
      .setLabel(labels.chooseOtherLangBtn)
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row], files };
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const prefs = dbService.getUserPreferences(interaction.user.id);
  if (!prefs.setup_completed) {
    const clientLangCode = mapDiscordLocaleToLanguage(interaction.locale);
    const labels = await getDynamicSetupLabels(interaction.locale);
    const { embed, components, files } = buildClientDetectedPrompt(
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
  const labels = await getDynamicSetupLabels(interaction.locale);
  const { embed, components } = buildStep1(prefs, interaction.locale, labels);

  await interaction.reply({
    embeds: [embed],
    components,
    flags: MessageFlags.Ephemeral,
  });
}
