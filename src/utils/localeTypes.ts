import { ALL_SUPPORTED_LANGUAGES } from './flags';

export interface UILabels {
  title: string;
  original: string;
  translated: string;
  deeplBtn: string;
  liveThreadBtn: string;
  requestedBy: string;
  error: string;
  dismiss: string;
  share: string;
  switchLangPlaceholder: string;
}

export interface SetupLabels {
  interceptTitle: string;
  interceptDesc: (user: string) => string;
  interceptPresetTitle: string;
  interceptPresetBody: string;
  detectClientBtn: string;
  manualChooseBtn: string;
  detectedLangField: string;
  useQuickBtn: (langName: string) => string;
  startSetupBtn: string;
  cancelBtn: string;

  clientDetectedTitle: string;
  clientDetectedDesc: (langName: string, langCode: string) => string;
  clientDetectedPreset: string;
  clientDetectedPresetBody: string;
  useClientLangBtn: (langName: string) => string;
  chooseOtherLangBtn: string;
  customizeSetupBtn: string;

  step1Title: string;
  step1Desc: string;
  currentSelection: string;
  detectedLocale: string;
  selectPlaceholder: string;
  nextDelivery: string;
  searchBtn: string;
  searchModalTitle: string;
  searchModalLabel: string;
  searchModalPlaceholder: string;
  resetSearchBtn: string;
  pageIndicator: (page: number, total: number) => string;
  noSearchMatch: (query: string) => string;

  step2Title: string;
  step2Desc: string;
  threadName: string;
  threadDesc: string;
  threadDisabled: string;
  threadStaffOnly: string;
  threadAvailable: string;
  threadBtn: string;
  dmName: string;
  dmDesc: string;
  ephemeralName: string;
  ephemeralDesc: string;
  targetLangField: string;
  backLang: string;
  nextPrefs: string;

  step3Title: string;
  step3Desc: string;
  showOriginalField: string;
  showOriginalDesc: string;
  autoDeleteField: string;
  autoDeleteDesc: string;
  engineField: string;
  engineDesc: string;
  deliveryField: string;
  enabled: string;
  disabled: string;
  originalToggle: (shown: boolean) => string;
  engineToggle: (isDeepl: boolean) => string;
  backDelivery: string;
  completeBtn: string;

  completionTitle: string;
  completionDesc: string;
  quickTipsTitle: string;
  quickTipsContent: string;
  openSettingsBtn: string;
}

export interface SettingsLabels {
  title: string;
  desc: string;
  targetLang: string;
  targetLangDesc: string;
  deliveryMode: string;
  modeThread: string;
  modeThreadDesc: string;
  modeDm: string;
  modeDmDesc: string;
  modeManual: string;
  modeManualDesc: string;
  showOriginal: string;
  showOriginalDesc: string;
  autoDelete: string;
  autoDeleteDesc: string;
  defaultEngine: string;
  defaultEngineDesc: string;
  footer: string;
  langPlaceholder: string;
  durationPlaceholder: string;
  durationPermanent: string;
  durationMinutes: (m: number) => string;
  engineDeepl: string;
  engineGoogle: string;
  enabled: string;
  disabled: string;
  toggleOriginal: (shown: boolean) => string;
  toggleEngine: (isDeepl: boolean) => string;
  btnModeThread: string;
  btnModeDm: string;
  btnModeManual: string;
  dismissBtn: string;
}

export interface ServerLabels {
  title: string;
  desc: string;
  threadsField: string;
  threadsExplain: string;
  publicField: string;
  publicExplain: string;
  flagsField: string;
  flagsExplain: string;
  footer: string;
  threadsDisabled: string;
  threadsAdminsOnly: string;
  threadsEveryone: string;
  publicDisabled: string;
  publicAdminsOnly: string;
  publicEveryone: string;
  flagsDisabled: string;
  flagsDmsOnly?: string;
  flagsChannelAllowed: string;
  threadsBtnLabel: (scope: string) => string;
  publicBtnLabel: (scope: string) => string;
  flagsBtnLabel: (allowed: boolean) => string;
  dismissBtn: string;
}

export interface HelpLabels {
  title: string;
  desc: string;
  sectionPrivate: string;
  sectionPrivateBody: string;
  sectionFlags: string;
  sectionFlagsBody: string;
  sectionDirect: string;
  sectionDirectBody: string;
  sectionPrefs: string;
  sectionPrefsBody: string;
  sectionServer: string;
  sectionServerBody: string;
  openSettingsBtn: string;
}
