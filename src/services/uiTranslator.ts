import { dbService } from '../db/database';
import { translationService } from './translator';
import {
  SetupLabels,
  SettingsLabels,
  ServerLabels,
  HelpLabels,
  UILabels,
  getSetupLabels,
  getSettingsLabels,
  getServerLabels,
  getHelpLabels,
  getUILabels,
} from '../utils/locales';

const BASE_SETUP_TEMPLATE: Record<string, string> = {
  interceptTitle: 'Welcome to Translation',
  interceptDesc:
    'Hello {user}! Translation translates messages live in a private thread or on-demand.\n\nClick below to adopt your Discord client language or choose any language manually:',
  interceptPresetTitle: 'Recommended Default Setup',
  interceptPresetBody:
    '• Mode: Private Live Thread (Automatic thread beside chat)\n• Engine: Google Cloud (Fast, supporting 135+ languages)\n• Flag Auto-Delete: 3 minutes (Keeps channels clean)\n• Show Original: Enabled (Compare translation with original quote)',
  detectClientBtn: 'Use Discord Client Language',
  manualChooseBtn: 'Choose Language Manually',
  detectedLangField: 'Detected Language',
  useQuickBtn: 'Use {lang} & Start',
  startSetupBtn: 'Customize Setup',
  cancelBtn: 'Dismiss',
  clientDetectedTitle: 'Discord Language Detected',
  clientDetectedDesc:
    'Your Discord language was detected as: {lang} ({code}). Do you want to use this language for your translations or pick another?',
  clientDetectedPreset: 'Recommended Configuration',
  clientDetectedPresetBody:
    '• Target Language: Configured\n• Mode: Private Live Thread (Personal thread)\n• Engine: Google Cloud\n• Flag Auto-Delete: 3 minutes\n• Show Original: Enabled',
  useClientLangBtn: 'Use {lang} & Continue ›',
  chooseOtherLangBtn: 'Choose Other Language',
  customizeSetupBtn: 'Customize Setup',
  step1Title: 'Step 1 of 3: Primary Language',
  step1Desc:
    'Select the language you want foreign messages translated into. The bot can also auto-detect your Discord client language.',
  currentSelection: 'Current Selection',
  detectedLocale: 'Detected Discord Locale',
  selectPlaceholder: 'Select your preferred language...',
  nextDelivery: 'Next: Delivery Mode ›',
  searchBtn: 'Search (135+)',
  searchModalTitle: 'Search All 135+ Languages',
  searchModalLabel: 'Language Name, Country, or Code',
  searchModalPlaceholder: 'e.g. Polish, pl, Japanese, ja, Swedish, sv...',
  resetSearchBtn: 'Popular (Top 25)',
  pageIndicatorPopular: 'Popular (1/{total})',
  pageIndicatorNumbered: 'Page {page}/{total}',
  noSearchMatch: 'No languages found matching "{query}". Try code (e.g. "pl", "sv") or name.',
  step2Title: 'Step 2 of 3: Choose Delivery Mode',
  step2Desc:
    'Choose how translations are delivered. Select one logical mode (they are mutually exclusive):',
  threadName: 'Private Live Thread (Default & Recommended)',
  threadDesc:
    'Automatically opens a private thread beside chat. Translations stream in real time without cluttering main chat.',
  threadDisabled: 'Disabled by server staff',
  threadStaffOnly: 'Staff only (Prevents channel flooding)',
  threadAvailable: 'Starts automatically in channels (Zero commands needed)',
  threadBtn: 'Live Thread',
  dmName: 'Direct Messages (DM Feed)',
  dmDesc:
    'Foreign messages are forwarded directly to your personal Discord DMs. Replaces the live thread.',
  ephemeralName: 'On-Demand (Manual)',
  ephemeralDesc:
    'No automatic streaming feeds. Translations appear only when you click or react with a flag.',
  targetLangField: 'Target Language',
  backLang: '‹ Back: Language',
  nextPrefs: 'Next: Fine-Tuning ›',
  step3Title: 'Step 3 of 3: Fine-Tuning',
  step3Desc: 'Review your options. Default values are pre-configured for optimal communication:',
  showOriginalField: 'Show Original Text',
  showOriginalDesc: 'Includes the foreign original text as a quote under the translation for easy comparison.',
  autoDeleteField: 'Flag Auto-Delete',
  autoDeleteDesc: 'Channel replies from flag reactions are automatically cleaned up after 3 minutes.',
  engineField: 'Translation Engine',
  engineDesc: 'Google Cloud delivers high-speed translations across 135+ languages.',
  deliveryField: 'Selected Delivery Mode',
  enabled: 'Enabled',
  disabled: 'Disabled',
  originalShown: 'Original: Shown',
  originalHidden: 'Original: Hidden',
  engineDeepl: 'Engine: DeepL',
  engineGoogle: 'Engine: Google Cloud',
  backDelivery: '‹ Back: Delivery',
  completeBtn: 'Complete Setup',
  completionTitle: 'Setup Complete',
  completionDesc:
    'Your translation preferences are active and securely saved. You are ready to chat seamlessly across languages.',
  quickTipsTitle: 'Quick Guide',
  quickTipsContent:
    '• Private Live Thread: Automatic personal thread alongside chat (Zero commands needed)\n• Right-click any message › Apps › Translate\n• Preferences: Type /settings anytime to change your delivery mode',
  openSettingsBtn: 'View Settings',
};

const BASE_SETTINGS_TEMPLATE: Record<string, string> = {
  title: 'Translation Settings',
  desc: 'Customize how translations are delivered and formatted for your account.',
  targetLang: 'Target Language',
  targetLangDesc: 'Foreign messages are translated into this language by default.',
  deliveryMode: 'Delivery Mode',
  modeThread: 'Private Live Thread (Recommended)',
  modeThreadDesc: 'Automatic real-time translation stream in a private side-thread beside chat.',
  modeDm: 'Direct Messages (DM Feed)',
  modeDmDesc: 'Automatic translation stream sent directly to your private Discord DMs.',
  modeManual: 'On-Demand (Manual)',
  modeManualDesc: 'No automatic feeds. Translations appear only when you click or react with flags.',
  showOriginal: 'Show Original Text',
  showOriginalDesc: 'Includes the foreign quote under the translation for easy reference.',
  autoDelete: 'Flag Auto-Delete',
  autoDeleteDesc: 'Time channel flag responses remain before automatic cleanup (Default: 3 min).',
  defaultEngine: 'Translation Engine',
  defaultEngineDesc: 'Google Cloud (135+ languages) or DeepL (High linguistic nuance).',
  footer: 'Changes apply instantly and are securely encrypted.',
  langPlaceholder: 'Select default target language...',
  durationPlaceholder: 'Select auto-delete duration...',
  durationPermanent: 'Permanent (Never auto-deletes)',
  durationMinuteSingular: '1 minute',
  durationMinutePlural: '{m} minutes',
  engineDeepl: 'DeepL (High Precision)',
  engineGoogle: 'Google Cloud (Fast & 135+ Languages)',
  enabled: 'Enabled',
  disabled: 'Disabled',
  originalHide: 'Original: Hide',
  originalShow: 'Original: Show',
  engineToggleGoogle: 'Engine: Google Cloud',
  engineToggleDeepl: 'Engine: DeepL',
  btnModeThread: 'Live Thread',
  btnModeDm: 'DM-Feed',
  btnModeManual: 'On-Demand',
  dismissBtn: 'Done',
};

const BASE_SERVER_TEMPLATE: Record<string, string> = {
  title: 'Server Translation Guardrails',
  desc: 'Control how translations operate server-wide to prevent members from flooding or cluttering public channels.',
  threadsField: 'Live Translation Threads',
  threadsExplain: 'Controls who can create real-time side threads in channels.',
  publicField: 'Public Channel Translations',
  publicExplain: 'Controls who can post permanent translations or share to channel.',
  flagsField: 'Flag Reactions',
  flagsExplain:
    'When members react with flags, controls if a translated reply is posted in the channel.',
  footer: 'Changes take effect immediately across all channels in this server.',
  threadsDisabled: 'Disabled (Zero Threads Allowed)',
  threadsAdminsOnly: 'Admins Only (Safe Default)',
  threadsEveryone: 'Everyone',
  publicDisabled: 'Disabled (Ephemeral Only)',
  publicAdminsOnly: 'Admins Only (Safe Default)',
  publicEveryone: 'Everyone',
  flagsDisabled: 'Disabled (No Flag Replies)',
  flagsDmsOnly: 'Disabled (No Flag Replies)',
  flagsChannelAllowed: 'Enabled (Channel Reply)',
  threadsAdminsBtn: 'Threads: Admins Only',
  threadsDisabledBtn: 'Threads: Disabled',
  threadsEveryoneBtn: 'Threads: Everyone',
  publicAdminsBtn: 'Public: Admins Only',
  publicDisabledBtn: 'Public: Disabled',
  publicEveryoneBtn: 'Public: Everyone',
  flagsChannelBtn: 'Flags: Enabled',
  flagsDisabledBtn: 'Flags: Disabled',
  flagsDmBtn: 'Flags: Disabled',
  dismissBtn: 'Dismiss',
};

const BASE_HELP_TEMPLATE: Record<string, string> = {
  title: 'Translation Guide',
  desc: 'High-speed translation bot powered by Google Cloud Translation & DeepL.',
  sectionPrivate: 'Private Live Thread (Recommended)',
  sectionPrivateBody:
    'Creates a private thread alongside the channel. Foreign messages are automatically translated in real time without cluttering main chat.',
  sectionFlags: 'Flag Reactions',
  sectionFlagsBody:
    'React to any message with a flag emoji (e.g. 🇩🇪, 🇬🇧, 🇯🇵) to instantly translate it into that language.',
  sectionDirect: 'Direct & Context Menu',
  sectionDirectBody:
    'Right-click any message › Apps › Translate, or use the /translate command.',
  sectionPrefs: 'Personal Preferences',
  sectionPrefsBody:
    'Type /settings to change your target language, delivery mode, or AI engine.',
  sectionServer: 'Server Guardrails',
  sectionServerBody:
    'Server managers can type /server-settings to control permissions and prevent channel flooding.',
  openSettingsBtn: 'Open Settings',
};

const BASE_UI_TEMPLATE: Record<string, string> = {
  title: 'Translation',
  original: 'Original',
  translated: 'Translated',
  deeplBtn: 'DeepL',
  liveThreadBtn: 'Live Thread',
  requestedBy: 'requested translation:',
  error: 'Translation failed. Please try again.',
  dismiss: 'Dismiss',
  share: 'Share to Channel',
  switchLangPlaceholder: 'Switch language on the fly...',
};

const memoryBundleCache = new Map<string, Record<string, string>>();

async function getOrTranslateBundle(
  bundleKey: string,
  targetLang: string,
  baseTemplate: Record<string, string>
): Promise<Record<string, string>> {
  const normLang = targetLang.toLowerCase().split('-')[0];

  if (normLang === 'en') {
    return baseTemplate;
  }

  const cacheKey = `${bundleKey}_${normLang}`;

  if (memoryBundleCache.has(cacheKey)) {
    return memoryBundleCache.get(cacheKey)!;
  }

  const mongoDoc = dbService.getUIBundle(cacheKey);
  if (mongoDoc) {
    memoryBundleCache.set(cacheKey, mongoDoc);
    return mongoDoc;
  }

  try {
    const keys = Object.keys(baseTemplate);
    const textToTranslate = keys
      .map((k) => {
        const val = baseTemplate[k];
        return `<p id="${k}">${val}</p>`;
      })
      .join('\n');

    const rawTranslated = await translationService.translateWithGoogle(textToTranslate, normLang);

    const translatedMap: Record<string, string> = { ...baseTemplate };
    const regex = /<p id="([^"]+)">([^<]+)<\/p>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(rawTranslated)) !== null) {
      const key = match[1];
      const translatedVal = match[2].trim();
      if (key && baseTemplate[key] !== undefined) {
        translatedMap[key] = translatedVal;
      }
    }

    memoryBundleCache.set(cacheKey, translatedMap);
    await dbService.saveUIBundle(cacheKey, normLang, translatedMap);

    return translatedMap;
  } catch (err) {
    console.error(`Failed to auto-translate bundle ${bundleKey}:`, err);
    return baseTemplate;
  }
}

function hydrateSetupLabels(raw: Record<string, string>): SetupLabels {
  return {
    interceptTitle: raw.interceptTitle || BASE_SETUP_TEMPLATE.interceptTitle,
    interceptDesc: (user: string) =>
      (raw.interceptDesc || BASE_SETUP_TEMPLATE.interceptDesc).replace('{user}', user),
    interceptPresetTitle:
      raw.interceptPresetTitle || BASE_SETUP_TEMPLATE.interceptPresetTitle,
    interceptPresetBody:
      raw.interceptPresetBody || BASE_SETUP_TEMPLATE.interceptPresetBody,
    detectClientBtn: raw.detectClientBtn || BASE_SETUP_TEMPLATE.detectClientBtn,
    manualChooseBtn: raw.manualChooseBtn || BASE_SETUP_TEMPLATE.manualChooseBtn,
    detectedLangField: raw.detectedLangField || BASE_SETUP_TEMPLATE.detectedLangField,
    useQuickBtn: (lang: string) =>
      (raw.useQuickBtn || BASE_SETUP_TEMPLATE.useQuickBtn).replace('{lang}', lang),
    startSetupBtn: raw.startSetupBtn || BASE_SETUP_TEMPLATE.startSetupBtn,
    cancelBtn: raw.cancelBtn || BASE_SETUP_TEMPLATE.cancelBtn,
    clientDetectedTitle:
      raw.clientDetectedTitle || BASE_SETUP_TEMPLATE.clientDetectedTitle,
    clientDetectedDesc: (lang: string, code: string) =>
      (raw.clientDetectedDesc || BASE_SETUP_TEMPLATE.clientDetectedDesc)
        .replace('{lang}', lang)
        .replace('{code}', code),
    clientDetectedPreset:
      raw.clientDetectedPreset || BASE_SETUP_TEMPLATE.clientDetectedPreset,
    clientDetectedPresetBody:
      raw.clientDetectedPresetBody || BASE_SETUP_TEMPLATE.clientDetectedPresetBody,
    useClientLangBtn: (lang: string) =>
      (raw.useClientLangBtn || BASE_SETUP_TEMPLATE.useClientLangBtn).replace('{lang}', lang),
    chooseOtherLangBtn:
      raw.chooseOtherLangBtn || BASE_SETUP_TEMPLATE.chooseOtherLangBtn,
    customizeSetupBtn:
      raw.customizeSetupBtn || BASE_SETUP_TEMPLATE.customizeSetupBtn,
    step1Title: raw.step1Title || BASE_SETUP_TEMPLATE.step1Title,
    step1Desc: raw.step1Desc || BASE_SETUP_TEMPLATE.step1Desc,
    currentSelection: raw.currentSelection || BASE_SETUP_TEMPLATE.currentSelection,
    detectedLocale: raw.detectedLocale || BASE_SETUP_TEMPLATE.detectedLocale,
    selectPlaceholder: raw.selectPlaceholder || BASE_SETUP_TEMPLATE.selectPlaceholder,
    nextDelivery: raw.nextDelivery || BASE_SETUP_TEMPLATE.nextDelivery,
    searchBtn: raw.searchBtn || BASE_SETUP_TEMPLATE.searchBtn,
    searchModalTitle: raw.searchModalTitle || BASE_SETUP_TEMPLATE.searchModalTitle,
    searchModalLabel: raw.searchModalLabel || BASE_SETUP_TEMPLATE.searchModalLabel,
    searchModalPlaceholder:
      raw.searchModalPlaceholder || BASE_SETUP_TEMPLATE.searchModalPlaceholder,
    resetSearchBtn: raw.resetSearchBtn || BASE_SETUP_TEMPLATE.resetSearchBtn,
    pageIndicator: (p: number, t: number) =>
      p === 0
        ? (raw.pageIndicatorPopular || BASE_SETUP_TEMPLATE.pageIndicatorPopular).replace(
            '{total}',
            String(t)
          )
        : (raw.pageIndicatorNumbered || BASE_SETUP_TEMPLATE.pageIndicatorNumbered)
            .replace('{page}', String(p + 1))
            .replace('{total}', String(t)),
    noSearchMatch: (q: string) =>
      (raw.noSearchMatch || BASE_SETUP_TEMPLATE.noSearchMatch).replace('{query}', q),
    step2Title: raw.step2Title || BASE_SETUP_TEMPLATE.step2Title,
    step2Desc: raw.step2Desc || BASE_SETUP_TEMPLATE.step2Desc,
    threadName: raw.threadName || BASE_SETUP_TEMPLATE.threadName,
    threadDesc: raw.threadDesc || BASE_SETUP_TEMPLATE.threadDesc,
    threadDisabled: raw.threadDisabled || BASE_SETUP_TEMPLATE.threadDisabled,
    threadStaffOnly: raw.threadStaffOnly || BASE_SETUP_TEMPLATE.threadStaffOnly,
    threadAvailable: raw.threadAvailable || BASE_SETUP_TEMPLATE.threadAvailable,
    threadBtn: raw.threadBtn || BASE_SETUP_TEMPLATE.threadBtn,
    dmName: raw.dmName || BASE_SETUP_TEMPLATE.dmName,
    dmDesc: raw.dmDesc || BASE_SETUP_TEMPLATE.dmDesc,
    ephemeralName: raw.ephemeralName || BASE_SETUP_TEMPLATE.ephemeralName,
    ephemeralDesc: raw.ephemeralDesc || BASE_SETUP_TEMPLATE.ephemeralDesc,
    targetLangField: raw.targetLangField || BASE_SETUP_TEMPLATE.targetLangField,
    backLang: raw.backLang || BASE_SETUP_TEMPLATE.backLang,
    nextPrefs: raw.nextPrefs || BASE_SETUP_TEMPLATE.nextPrefs,
    step3Title: raw.step3Title || BASE_SETUP_TEMPLATE.step3Title,
    step3Desc: raw.step3Desc || BASE_SETUP_TEMPLATE.step3Desc,
    showOriginalField: raw.showOriginalField || BASE_SETUP_TEMPLATE.showOriginalField,
    showOriginalDesc: raw.showOriginalDesc || BASE_SETUP_TEMPLATE.showOriginalDesc,
    autoDeleteField: raw.autoDeleteField || BASE_SETUP_TEMPLATE.autoDeleteField,
    autoDeleteDesc: raw.autoDeleteDesc || BASE_SETUP_TEMPLATE.autoDeleteDesc,
    engineField: raw.engineField || BASE_SETUP_TEMPLATE.engineField,
    engineDesc: raw.engineDesc || BASE_SETUP_TEMPLATE.engineDesc,
    deliveryField: raw.deliveryField || BASE_SETUP_TEMPLATE.deliveryField,
    enabled: raw.enabled || BASE_SETUP_TEMPLATE.enabled,
    disabled: raw.disabled || BASE_SETUP_TEMPLATE.disabled,
    originalToggle: (shown: boolean) =>
      shown
        ? raw.originalShown || BASE_SETUP_TEMPLATE.originalShown
        : raw.originalHidden || BASE_SETUP_TEMPLATE.originalHidden,
    engineToggle: (isDeepl: boolean) =>
      isDeepl
        ? raw.engineDeepl || BASE_SETUP_TEMPLATE.engineDeepl
        : raw.engineGoogle || BASE_SETUP_TEMPLATE.engineGoogle,
    backDelivery: raw.backDelivery || BASE_SETUP_TEMPLATE.backDelivery,
    completeBtn: raw.completeBtn || BASE_SETUP_TEMPLATE.completeBtn,
    completionTitle: raw.completionTitle || BASE_SETUP_TEMPLATE.completionTitle,
    completionDesc: raw.completionDesc || BASE_SETUP_TEMPLATE.completionDesc,
    quickTipsTitle: raw.quickTipsTitle || BASE_SETUP_TEMPLATE.quickTipsTitle,
    quickTipsContent: raw.quickTipsContent || BASE_SETUP_TEMPLATE.quickTipsContent,
    openSettingsBtn: raw.openSettingsBtn || BASE_SETUP_TEMPLATE.openSettingsBtn,
  };
}

function hydrateSettingsLabels(raw: Record<string, string>): SettingsLabels {
  return {
    title: raw.title || BASE_SETTINGS_TEMPLATE.title,
    desc: raw.desc || BASE_SETTINGS_TEMPLATE.desc,
    targetLang: raw.targetLang || BASE_SETTINGS_TEMPLATE.targetLang,
    targetLangDesc: raw.targetLangDesc || BASE_SETTINGS_TEMPLATE.targetLangDesc,
    deliveryMode: raw.deliveryMode || BASE_SETTINGS_TEMPLATE.deliveryMode,
    modeThread: raw.modeThread || BASE_SETTINGS_TEMPLATE.modeThread,
    modeThreadDesc: raw.modeThreadDesc || BASE_SETTINGS_TEMPLATE.modeThreadDesc,
    modeDm: raw.modeDm || BASE_SETTINGS_TEMPLATE.modeDm,
    modeDmDesc: raw.modeDmDesc || BASE_SETTINGS_TEMPLATE.modeDmDesc,
    modeManual: raw.modeManual || BASE_SETTINGS_TEMPLATE.modeManual,
    modeManualDesc: raw.modeManualDesc || BASE_SETTINGS_TEMPLATE.modeManualDesc,
    showOriginal: raw.showOriginal || BASE_SETTINGS_TEMPLATE.showOriginal,
    showOriginalDesc: raw.showOriginalDesc || BASE_SETTINGS_TEMPLATE.showOriginalDesc,
    autoDelete: raw.autoDelete || BASE_SETTINGS_TEMPLATE.autoDelete,
    autoDeleteDesc: raw.autoDeleteDesc || BASE_SETTINGS_TEMPLATE.autoDeleteDesc,
    defaultEngine: raw.defaultEngine || BASE_SETTINGS_TEMPLATE.defaultEngine,
    defaultEngineDesc: raw.defaultEngineDesc || BASE_SETTINGS_TEMPLATE.defaultEngineDesc,
    footer: raw.footer || BASE_SETTINGS_TEMPLATE.footer,
    langPlaceholder: raw.langPlaceholder || BASE_SETTINGS_TEMPLATE.langPlaceholder,
    durationPlaceholder: raw.durationPlaceholder || BASE_SETTINGS_TEMPLATE.durationPlaceholder,
    durationPermanent: raw.durationPermanent || BASE_SETTINGS_TEMPLATE.durationPermanent,
    durationMinutes: (m: number) =>
      m === 1
        ? raw.durationMinuteSingular || BASE_SETTINGS_TEMPLATE.durationMinuteSingular
        : (raw.durationMinutePlural || BASE_SETTINGS_TEMPLATE.durationMinutePlural).replace(
            '{m}',
            String(m)
          ),
    engineDeepl: raw.engineDeepl || BASE_SETTINGS_TEMPLATE.engineDeepl,
    engineGoogle: raw.engineGoogle || BASE_SETTINGS_TEMPLATE.engineGoogle,
    enabled: raw.enabled || BASE_SETTINGS_TEMPLATE.enabled,
    disabled: raw.disabled || BASE_SETTINGS_TEMPLATE.disabled,
    toggleOriginal: (shown: boolean) =>
      shown
        ? raw.originalHide || BASE_SETTINGS_TEMPLATE.originalHide
        : raw.originalShow || BASE_SETTINGS_TEMPLATE.originalShow,
    toggleEngine: (isDeepl: boolean) =>
      isDeepl
        ? raw.engineToggleGoogle || BASE_SETTINGS_TEMPLATE.engineToggleGoogle
        : raw.engineToggleDeepl || BASE_SETTINGS_TEMPLATE.engineToggleDeepl,
    btnModeThread: raw.btnModeThread || BASE_SETTINGS_TEMPLATE.btnModeThread,
    btnModeDm: raw.btnModeDm || BASE_SETTINGS_TEMPLATE.btnModeDm,
    btnModeManual: raw.btnModeManual || BASE_SETTINGS_TEMPLATE.btnModeManual,
    dismissBtn: raw.dismissBtn || BASE_SETTINGS_TEMPLATE.dismissBtn,
  };
}

function hydrateServerLabels(raw: Record<string, string>): ServerLabels {
  return {
    title: raw.title || BASE_SERVER_TEMPLATE.title,
    desc: raw.desc || BASE_SERVER_TEMPLATE.desc,
    threadsField: raw.threadsField || BASE_SERVER_TEMPLATE.threadsField,
    threadsExplain: raw.threadsExplain || BASE_SERVER_TEMPLATE.threadsExplain,
    publicField: raw.publicField || BASE_SERVER_TEMPLATE.publicField,
    publicExplain: raw.publicExplain || BASE_SERVER_TEMPLATE.publicExplain,
    flagsField: raw.flagsField || BASE_SERVER_TEMPLATE.flagsField,
    flagsExplain: raw.flagsExplain || BASE_SERVER_TEMPLATE.flagsExplain,
    footer: raw.footer || BASE_SERVER_TEMPLATE.footer,
    threadsDisabled: raw.threadsDisabled || BASE_SERVER_TEMPLATE.threadsDisabled,
    threadsAdminsOnly: raw.threadsAdminsOnly || BASE_SERVER_TEMPLATE.threadsAdminsOnly,
    threadsEveryone: raw.threadsEveryone || BASE_SERVER_TEMPLATE.threadsEveryone,
    publicDisabled: raw.publicDisabled || BASE_SERVER_TEMPLATE.publicDisabled,
    publicAdminsOnly: raw.publicAdminsOnly || BASE_SERVER_TEMPLATE.publicAdminsOnly,
    publicEveryone: raw.publicEveryone || BASE_SERVER_TEMPLATE.publicEveryone,
    flagsDisabled: raw.flagsDisabled || raw.flagsDmsOnly || BASE_SERVER_TEMPLATE.flagsDisabled,
    flagsDmsOnly: raw.flagsDisabled || raw.flagsDmsOnly || BASE_SERVER_TEMPLATE.flagsDisabled,
    flagsChannelAllowed: raw.flagsChannelAllowed || BASE_SERVER_TEMPLATE.flagsChannelAllowed,
    threadsBtnLabel: (scope: string) =>
      scope === 'disabled'
        ? raw.threadsDisabledBtn || BASE_SERVER_TEMPLATE.threadsDisabledBtn
        : scope === 'admin_only'
        ? raw.threadsAdminsBtn || BASE_SERVER_TEMPLATE.threadsAdminsBtn
        : raw.threadsEveryoneBtn || BASE_SERVER_TEMPLATE.threadsEveryoneBtn,
    publicBtnLabel: (scope: string) =>
      scope === 'disabled'
        ? raw.publicDisabledBtn || BASE_SERVER_TEMPLATE.publicDisabledBtn
        : scope === 'admin_only'
        ? raw.publicAdminsBtn || BASE_SERVER_TEMPLATE.publicAdminsBtn
        : raw.publicEveryoneBtn || BASE_SERVER_TEMPLATE.publicEveryoneBtn,
    flagsBtnLabel: (allowed: boolean) =>
      allowed
        ? raw.flagsChannelBtn || BASE_SERVER_TEMPLATE.flagsChannelBtn
        : raw.flagsDisabledBtn || raw.flagsDmBtn || BASE_SERVER_TEMPLATE.flagsDisabledBtn,
    dismissBtn: raw.dismissBtn || BASE_SERVER_TEMPLATE.dismissBtn,
  };
}

function hydrateHelpLabels(raw: Record<string, string>): HelpLabels {
  return {
    title: raw.title || BASE_HELP_TEMPLATE.title,
    desc: raw.desc || BASE_HELP_TEMPLATE.desc,
    sectionPrivate: raw.sectionPrivate || BASE_HELP_TEMPLATE.sectionPrivate,
    sectionPrivateBody: raw.sectionPrivateBody || BASE_HELP_TEMPLATE.sectionPrivateBody,
    sectionFlags: raw.sectionFlags || BASE_HELP_TEMPLATE.sectionFlags,
    sectionFlagsBody: raw.sectionFlagsBody || BASE_HELP_TEMPLATE.sectionFlagsBody,
    sectionDirect: raw.sectionDirect || BASE_HELP_TEMPLATE.sectionDirect,
    sectionDirectBody: raw.sectionDirectBody || BASE_HELP_TEMPLATE.sectionDirectBody,
    sectionPrefs: raw.sectionPrefs || BASE_HELP_TEMPLATE.sectionPrefs,
    sectionPrefsBody: raw.sectionPrefsBody || BASE_HELP_TEMPLATE.sectionPrefsBody,
    sectionServer: raw.sectionServer || BASE_HELP_TEMPLATE.sectionServer,
    sectionServerBody: raw.sectionServerBody || BASE_HELP_TEMPLATE.sectionServerBody,
    openSettingsBtn: raw.openSettingsBtn || BASE_HELP_TEMPLATE.openSettingsBtn,
  };
}

function hydrateUILabels(raw: Record<string, string>): UILabels {
  return {
    title: raw.title || BASE_UI_TEMPLATE.title,
    original: raw.original || BASE_UI_TEMPLATE.original,
    translated: raw.translated || BASE_UI_TEMPLATE.translated,
    deeplBtn: raw.deeplBtn || BASE_UI_TEMPLATE.deeplBtn,
    liveThreadBtn: raw.liveThreadBtn || BASE_UI_TEMPLATE.liveThreadBtn,
    requestedBy: raw.requestedBy || BASE_UI_TEMPLATE.requestedBy,
    error: raw.error || BASE_UI_TEMPLATE.error,
    dismiss: raw.dismiss || BASE_UI_TEMPLATE.dismiss,
    share: raw.share || BASE_UI_TEMPLATE.share,
    switchLangPlaceholder:
      raw.switchLangPlaceholder || BASE_UI_TEMPLATE.switchLangPlaceholder,
  };
}

export async function getDynamicSetupLabels(locale?: string): Promise<SetupLabels> {
  const norm = (locale || 'en').toLowerCase().split('-')[0];
  const staticLabels = getSetupLabels(norm);
  if (['en', 'de', 'es', 'fr', 'it'].includes(norm)) {
    return staticLabels;
  }
  const translated = await getOrTranslateBundle('setup_v2', norm, BASE_SETUP_TEMPLATE);
  return hydrateSetupLabels(translated);
}

export async function getDynamicSettingsLabels(locale?: string): Promise<SettingsLabels> {
  const norm = (locale || 'en').toLowerCase().split('-')[0];
  const staticLabels = getSettingsLabels(norm);
  if (['en', 'de', 'es', 'fr', 'it'].includes(norm)) {
    return staticLabels;
  }
  const translated = await getOrTranslateBundle('settings_v2', norm, BASE_SETTINGS_TEMPLATE);
  return hydrateSettingsLabels(translated);
}

export async function getDynamicServerLabels(locale?: string): Promise<ServerLabels> {
  const norm = (locale || 'en').toLowerCase().split('-')[0];
  const staticLabels = getServerLabels(norm);
  if (['en', 'de', 'es', 'fr', 'it'].includes(norm)) {
    return staticLabels;
  }
  const translated = await getOrTranslateBundle('server_v2', norm, BASE_SERVER_TEMPLATE);
  return hydrateServerLabels(translated);
}

export async function getDynamicHelpLabels(locale?: string): Promise<HelpLabels> {
  const norm = (locale || 'en').toLowerCase().split('-')[0];
  const staticLabels = getHelpLabels(norm);
  if (['en', 'de', 'es', 'fr', 'it'].includes(norm)) {
    return staticLabels;
  }
  const translated = await getOrTranslateBundle('help_v2', norm, BASE_HELP_TEMPLATE);
  return hydrateHelpLabels(translated);
}

export async function getDynamicUILabels(locale?: string): Promise<UILabels> {
  const norm = (locale || 'en').toLowerCase().split('-')[0];
  const staticLabels = getUILabels(norm);
  if (['en', 'de', 'es', 'fr', 'it'].includes(norm)) {
    return staticLabels;
  }
  const translated = await getOrTranslateBundle('ui_v2', norm, BASE_UI_TEMPLATE);
  return hydrateUILabels(translated);
}
