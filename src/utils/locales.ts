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

const UI_DICTIONARIES: Record<string, UILabels> = {
  en: {
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
  },
  de: {
    title: 'Übersetzung',
    original: 'Original',
    translated: 'Übersetzt',
    deeplBtn: 'DeepL',
    liveThreadBtn: 'Live-Thread',
    requestedBy: 'hat eine Übersetzung angefordert:',
    error: 'Übersetzung fehlgeschlagen. Bitte versuche es erneut.',
    dismiss: 'Schließen',
    share: 'Im Kanal teilen',
    switchLangPlaceholder: 'Sprache spontan wechseln...',
  },
  es: {
    title: 'Traducción',
    original: 'Original',
    translated: 'Traducido',
    deeplBtn: 'DeepL',
    liveThreadBtn: 'Hilo en vivo',
    requestedBy: 'solicitó una traducción:',
    error: 'Error al traducir. Inténtalo de nuevo.',
    dismiss: 'Descartar',
    share: 'Compartir en el canal',
    switchLangPlaceholder: 'Cambiar idioma al instante...',
  },
  fr: {
    title: 'Traduction',
    original: 'Original',
    translated: 'Traduit',
    deeplBtn: 'DeepL',
    liveThreadBtn: 'Fil en direct',
    requestedBy: 'a demandé une traduction :',
    error: 'Échec de la traduction. Veuillez réessayer.',
    dismiss: 'Fermer',
    share: 'Partager dans le salon',
    switchLangPlaceholder: 'Changer de langue à la volée...',
  },
  it: {
    title: 'Traduzione',
    original: 'Originale',
    translated: 'Tradotto',
    deeplBtn: 'DeepL',
    liveThreadBtn: 'Thread Live',
    requestedBy: 'ha richiesto una traduzione:',
    error: 'Traduzione non riuscita. Riprova.',
    dismiss: 'Chiudi',
    share: 'Condividi nel canale',
    switchLangPlaceholder: 'Cambia lingua al volo...',
  },
};

const SETUP_DICTIONARIES: Record<string, SetupLabels> = {
  en: {
    interceptTitle: 'Welcome to Translation',
    interceptDesc: (user) =>
      `Hello ${user}! Translation translates messages live in a private thread or on-demand.\n\nClick below to adopt your Discord client language or choose any language manually:`,
    interceptPresetTitle: 'Recommended Default Setup',
    interceptPresetBody: [
      '• Mode: Private Live Thread (Automatic thread beside chat)',
      '• Engine: Google Cloud (Fast, 135+ languages)',
      '• Flag Auto-Delete: 3 minutes (Keeps channels clean)',
      '• Show Original: Enabled (Compare translation with original quote)',
    ].join('\n'),
    detectClientBtn: 'Use Discord Client Language',
    manualChooseBtn: 'Choose Language Manually',
    detectedLangField: 'Detected Language',
    useQuickBtn: (lang) => `Use ${lang} & Start`,
    startSetupBtn: 'Customize Setup',
    cancelBtn: 'Dismiss',

    clientDetectedTitle: 'Discord Language Detected',
    clientDetectedDesc: (lang, code) =>
      `Your Discord language was detected as: **${lang}** (\`${code}\`).\n\nWould you like to use this language for your translations or pick another?`,
    clientDetectedPreset: 'Recommended Configuration',
    clientDetectedPresetBody: [
      '• Target Language: Configured',
      '• Mode: Private Live Thread (Personal thread)',
      '• Engine: Google Cloud',
      '• Flag Auto-Delete: 3 minutes',
      '• Show Original: Enabled',
    ].join('\n'),
    useClientLangBtn: (lang) => `Use ${lang} & Continue ›`,
    chooseOtherLangBtn: 'Choose Other Language',
    customizeSetupBtn: 'Customize Setup',

    step1Title: 'Step 1 of 3: Primary Language',
    step1Desc:
      'Choose the language into which foreign messages will be translated by default. The bot automatically detects your Discord client language.',
    currentSelection: 'Current Selection',
    detectedLocale: 'Detected Discord Locale',
    selectPlaceholder: 'Select your preferred language...',
    nextDelivery: 'Next: Delivery Mode ›',
    searchBtn: 'Search (135+)',
    searchModalTitle: 'Search All 135+ Languages',
    searchModalLabel: 'Language Name, Country, or Code',
    searchModalPlaceholder: 'e.g. Polish, pl, Japanese, ja, Swedish, sv...',
    resetSearchBtn: 'Popular (Top 25)',
    pageIndicator: (p, t) => (p === 0 ? `Popular (1/${t})` : `Page ${p + 1}/${t}`),
    noSearchMatch: (q) => `No languages found matching "${q}". Try code (e.g. "pl") or name.`,

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
    step3Desc:
      'Review your options. Default values are pre-configured for optimal communication:',
    showOriginalField: 'Show Original Text',
    showOriginalDesc: 'Includes the foreign original text as a quote under the translation for easy comparison.',
    autoDeleteField: 'Flag Auto-Delete',
    autoDeleteDesc: 'Channel replies from flag reactions are automatically cleaned up after 3 minutes.',
    engineField: 'Translation Engine',
    engineDesc: 'Google Cloud delivers high-speed translations across 135+ languages.',
    deliveryField: 'Selected Delivery Mode',
    enabled: 'Enabled',
    disabled: 'Disabled',
    originalToggle: (shown) => (shown ? 'Original: Shown' : 'Original: Hidden'),
    engineToggle: (isDeepl) => (isDeepl ? 'Engine: DeepL' : 'Engine: Google Cloud'),
    backDelivery: '‹ Back: Delivery',
    completeBtn: 'Complete Setup',

    completionTitle: 'Setup Complete',
    completionDesc:
      'Your translation preferences are active and securely saved. You are ready to chat seamlessly across languages.',
    quickTipsTitle: 'Quick Guide',
    quickTipsContent: [
      '• Private Live Thread: Automatic personal thread alongside chat (Zero commands needed)',
      '• Right-click any message › Apps › Translate',
      '• Preferences: Type /settings anytime to change your delivery mode',
    ].join('\n'),
    openSettingsBtn: 'View Settings',
  },
  de: {
    interceptTitle: 'Willkommen bei Translation',
    interceptDesc: (user) =>
      `Hallo ${user}! Der Translation-Bot übersetzt fremde Nachrichten automatisch live im privaten Thread oder auf Abruf.\n\nKlicke unten, um deine persönliche Discord-Sprache direkt zu übernehmen oder eine Sprache manuell zu wählen:`,
    interceptPresetTitle: 'Empfohlene Vorkonfiguration',
    interceptPresetBody: [
      '• Zustellmodus: Privater Live-Thread (Automatischer Thread neben dem Chat)',
      '• Engine: Google Cloud (Schnell & über 135 Sprachen)',
      '• Auto-Löschen: 3 Minuten (Hält Server-Kanäle sauber)',
      '• Originaltext: Aktiviert (Zum bequemen Vergleichen als Zitat)',
    ].join('\n'),
    detectClientBtn: 'Discord-Sprache übernehmen',
    manualChooseBtn: 'Sprache manuell wählen',
    detectedLangField: 'Erkannte Sprache',
    useQuickBtn: (lang) => `${lang} verwenden & Starten`,
    startSetupBtn: 'Setup anpassen',
    cancelBtn: 'Schließen',

    clientDetectedTitle: 'Discord-Sprache erkannt',
    clientDetectedDesc: (lang, code) =>
      `Deine Discord-Sprache ist: **${lang}** (\`${code}\`).\n\nMöchtest du diese Sprache für deine Übersetzungen nutzen oder eine andere Sprache wählen?`,
    clientDetectedPreset: 'Empfohlene Vorkonfiguration',
    clientDetectedPresetBody: [
      '• Zielsprache: Übernommen',
      '• Zustellmodus: Privater Live-Thread (Persönlicher Thread)',
      '• Engine: Google Cloud',
      '• Auto-Löschen: 3 Minuten',
      '• Originaltext: Aktiviert',
    ].join('\n'),
    useClientLangBtn: (lang) => `${lang} übernehmen & Weiter ›`,
    chooseOtherLangBtn: 'Andere Sprache wählen',
    customizeSetupBtn: 'Setup anpassen',

    step1Title: 'Schritt 1 von 3: Hauptsprache wählen',
    step1Desc:
      'Wähle die Sprache, in die fremdsprachige Nachrichten standardmäßig übersetzt werden sollen. Der Bot erkennt deine Discord-Sprache automatisch.',
    currentSelection: 'Aktuelle Auswahl',
    detectedLocale: 'Erkannte Discord-Sprache',
    selectPlaceholder: 'Wähle deine bevorzugte Sprache...',
    nextDelivery: 'Weiter: Zustellmodus ›',
    searchBtn: 'Suchen (135+)',
    searchModalTitle: 'Alle 135+ Sprachen durchsuchen',
    searchModalLabel: 'Sprachname, Land oder Code',
    searchModalPlaceholder: 'z.B. Polnisch, pl, Japanisch, ja, Schwedisch, sv...',
    resetSearchBtn: 'Beliebt (Top 25)',
    pageIndicator: (p, t) => (p === 0 ? `Beliebt (1/${t})` : `Seite ${p + 1}/${t}`),
    noSearchMatch: (q) => `Keine Sprache für "${q}" gefunden. Probiere einen Code (z.B. "pl") oder Namen.`,

    step2Title: 'Schritt 2 von 3: Zustellmodus wählen',
    step2Desc:
      'Wähle, wie du Übersetzungen erhalten möchtest. Wähle genau einen Modus (sie schließen sich gegenseitig logisch aus):',
    threadName: 'Privater Live-Thread (Standard & Empfohlen)',
    threadDesc:
      'Öffnet automatisch einen privaten Thread neben dem Hauptchat. Übersetzungen streamen live mit, ohne den Chat zu stören.',
    threadDisabled: 'Vom Server-Team deaktiviert',
    threadStaffOnly: 'Nur für Moderation',
    threadAvailable: 'Startet automatisch in Kanälen (Kein Befehl nötig)',
    threadBtn: 'Live-Thread',
    dmName: 'Direktnachrichten (DM-Feed)',
    dmDesc:
      'Fremde Nachrichten landen automatisch privat in deinen Bot-DMs. Ersetzt den Live-Thread.',
    ephemeralName: 'Auf Abruf (Manuell)',
    ephemeralDesc:
      'Keine automatischen Feeds. Übersetzungen erscheinen nur, wenn du gezielt klickst oder Flaggen setzt.',
    targetLangField: 'Zielsprache',
    backLang: '‹ Zurück: Sprache',
    nextPrefs: 'Weiter: Feineinstellungen ›',

    step3Title: 'Schritt 3 von 3: Feineinstellungen',
    step3Desc:
      'Überprüfe deine Anzeige-Optionen. Die Standardwerte sind bereits optimal für dich vorkonfiguriert:',
    showOriginalField: 'Originaltext anzeigen',
    showOriginalDesc: 'Blendet den fremdsprachigen Originaltext als Zitat unter der Übersetzung ein.',
    autoDeleteField: 'Auto-Löschen (Flaggen)',
    autoDeleteDesc: 'Flaggen-Übersetzungen im Kanal werden nach 3 Minuten automatisch aufgeräumt.',
    engineField: 'Übersetzungs-Engine',
    engineDesc: 'Google Cloud bietet schnelle Übersetzungen für über 135 Sprachen.',
    deliveryField: 'Gewählter Zustellmodus',
    enabled: 'Aktiviert',
    disabled: 'Deaktiviert',
    originalToggle: (shown) => (shown ? 'Original: Anzeigen' : 'Original: Ausblenden'),
    engineToggle: (isDeepl) => (isDeepl ? 'Engine: DeepL' : 'Engine: Google Cloud'),
    backDelivery: '‹ Zurück: Zustellung',
    completeBtn: 'Setup abschließen',

    completionTitle: 'Einrichtung erfolgreich abgeschlossen',
    completionDesc:
      'Deine Einstellungen wurden sicher verschlüsselt gespeichert. Du bist sofort startklar!',
    quickTipsTitle: 'Kurzanleitung',
    quickTipsContent: [
      '• Privater Live-Thread: Startet automatisch neben dem Chat (Kein Befehl nötig)',
      '• Rechtsklick auf eine Nachricht › Apps › Übersetzen',
      '• Einstellungen ändern: Tippe jederzeit /settings',
    ].join('\n'),
    openSettingsBtn: 'Einstellungen öffnen',
  },
  es: {
    interceptTitle: 'Bienvenido a Translation',
    interceptDesc: (user) =>
      `¡Hola ${user}! Translation traduce mensajes entrantes en vivo en un hilo privado o bajo demanda.\n\nHaz clic abajo para adoptar tu idioma de Discord o elegir uno manualmente:`,
    interceptPresetTitle: 'Configuración recomendada',
    interceptPresetBody: [
      '• Modo: Hilo privado en vivo (Hilo personal automático)',
      '• Motor: Google Cloud (Rápido, más de 135 idiomas)',
      '• Auto-eliminación: 3 minutos (Mantiene canales limpios)',
      '• Texto original: Activado (Cita de referencia)',
    ].join('\n'),
    detectClientBtn: 'Usar idioma de Discord',
    manualChooseBtn: 'Elegir idioma manualmente',
    detectedLangField: 'Idioma detectado',
    useQuickBtn: (lang) => `Usar ${lang} y comenzar`,
    startSetupBtn: 'Personalizar configuración',
    cancelBtn: 'Descartar',

    clientDetectedTitle: 'Idioma de Discord detectado',
    clientDetectedDesc: (lang, code) =>
      `Tu idioma de Discord es: **${lang}** (\`${code}\`).\n\n¿Deseas usar este idioma para tus traducciones o elegir otro?`,
    clientDetectedPreset: 'Configuración recomendada',
    clientDetectedPresetBody: [
      '• Idioma destino: Configurado',
      '• Modo: Hilo privado en vivo',
      '• Motor: Google Cloud',
      '• Auto-eliminación: 3 minutos',
      '• Texto original: Activado',
    ].join('\n'),
    useClientLangBtn: (lang) => `Usar ${lang} y continuar ›`,
    chooseOtherLangBtn: 'Elegir otro idioma',
    customizeSetupBtn: 'Personalizar configuración',

    step1Title: 'Paso 1 de 3: Idioma principal',
    step1Desc:
      'Elige el idioma al que deseas traducir los mensajes. El bot detecta automáticamente tu idioma de Discord.',
    currentSelection: 'Selección actual',
    detectedLocale: 'Idioma de Discord detectado',
    selectPlaceholder: 'Elige tu idioma preferido...',
    nextDelivery: 'Siguiente: Modo de entrega ›',
    searchBtn: 'Buscar (135+)',
    searchModalTitle: 'Buscar entre 135+ idiomas',
    searchModalLabel: 'Nombre, país o código del idioma',
    searchModalPlaceholder: 'ej. polaco, pl, japonés, ja, sueco, sv...',
    resetSearchBtn: 'Populares (Top 25)',
    pageIndicator: (p, t) => (p === 0 ? `Populares (1/${t})` : `Página ${p + 1}/${t}`),
    noSearchMatch: (q) => `No se encontró el idioma "${q}". Prueba un código o nombre.`,

    step2Title: 'Paso 2 de 3: Modo de entrega',
    step2Desc:
      'Elige cómo deseas recibir las traducciones (se excluyen mutuamente):',
    threadName: 'Hilo privado en vivo (Predeterminado y recomendado)',
    threadDesc:
      'Abre automáticamente un hilo privado junto al chat. Las traducciones se transmiten en tiempo real.',
    threadDisabled: 'Desactivado por el servidor',
    threadStaffOnly: 'Solo staff',
    threadAvailable: 'Se inicia automáticamente en canales (Sin comandos)',
    threadBtn: 'Hilo en vivo',
    dmName: 'Mensajes Directos (Feed MD)',
    dmDesc:
      'Los mensajes se envían directamente a tus MD privados. Reemplaza el hilo en vivo.',
    ephemeralName: 'A petición (Manual)',
    ephemeralDesc:
      'Sin transmisiones automáticas. Las traducciones aparecen solo al hacer clic o con banderas.',
    targetLangField: 'Idioma destino',
    backLang: '‹ Atrás: Idioma',
    nextPrefs: 'Siguiente: Ajustes ›',

    step3Title: 'Paso 3 de 3: Ajustes',
    step3Desc:
      'Revisa tus opciones de visualización antes de finalizar:',
    showOriginalField: 'Mostrar texto original',
    showOriginalDesc: 'Incluye la cita original debajo de la traducción.',
    autoDeleteField: 'Auto-eliminación de banderas',
    autoDeleteDesc: 'Las respuestas de banderas en canales se eliminan a los 3 minutos.',
    engineField: 'Motor de traducción',
    engineDesc: 'Google Cloud ofrece traducciones veloces en más de 135 idiomas.',
    deliveryField: 'Modo seleccionado',
    enabled: 'Activado',
    disabled: 'Desactivado',
    originalToggle: (shown) => (shown ? 'Original: Visible' : 'Original: Oculto'),
    engineToggle: (isDeepl) => (isDeepl ? 'Motor: DeepL' : 'Motor: Google Cloud'),
    backDelivery: '‹ Atrás: Entrega',
    completeBtn: 'Completar configuración',

    completionTitle: 'Configuración completada',
    completionDesc:
      'Tus preferencias han sido guardadas y cifradas. ¡Listo para chatear!',
    quickTipsTitle: 'Guía rápida',
    quickTipsContent: [
      '• Hilo privado en vivo: Hilo paralelo automático junto al chat (Sin comandos)',
      '• Clic derecho en un mensaje › Apps › Traducir',
      '• Ajustes: Escribe /settings en cualquier momento',
    ].join('\n'),
    openSettingsBtn: 'Abrir ajustes',
  },
  fr: {
    interceptTitle: 'Bienvenue sur Translation',
    interceptDesc: (user) =>
      `Bonjour ${user} ! Translation traduit les messages entrants en direct dans un fil privé ou sur demande.\n\nCliquez ci-dessous pour adopter la langue de votre Discord ou en choisir une manuellement :`,
    interceptPresetTitle: 'Configuration recommandée',
    interceptPresetBody: [
      '• Mode : Fil privé en direct (Fil automatique)',
      '• Moteur : Google Cloud (Rapide, plus de 135 langues)',
      '• Suppression auto : 3 minutes',
      '• Texte original : Activé (Citation de référence)',
    ].join('\n'),
    detectClientBtn: 'Utiliser la langue Discord',
    manualChooseBtn: 'Choisir manuellement',
    detectedLangField: 'Langue détectée',
    useQuickBtn: (lang) => `Utiliser ${lang} et démarrer`,
    startSetupBtn: 'Personnaliser la configuration',
    cancelBtn: 'Fermer',

    clientDetectedTitle: 'Langue Discord détectée',
    clientDetectedDesc: (lang, code) =>
      `Votre langue Discord est : **${lang}** (\`${code}\`).\n\nSouhaitez-vous utiliser cette langue pour vos traductions ou en choisir une autre ?`,
    clientDetectedPreset: 'Configuration recommandée',
    clientDetectedPresetBody: [
      '• Langue cible : Configurée',
      '• Mode : Fil privé en direct',
      '• Moteur : Google Cloud',
      '• Suppression auto : 3 minutes',
      '• Texte original : Activé',
    ].join('\n'),
    useClientLangBtn: (lang) => `Utiliser ${lang} et continuer ›`,
    chooseOtherLangBtn: 'Choisir une autre langue',
    customizeSetupBtn: 'Personnaliser la configuration',

    step1Title: 'Étape 1 sur 3 : Langue principale',
    step1Desc:
      'Sélectionnez la langue vers laquelle traduire les messages étrangers. Le bot détecte votre langue Discord.',
    currentSelection: 'Sélection actuelle',
    detectedLocale: 'Langue Discord détectée',
    selectPlaceholder: 'Choisir une langue préférée...',
    nextDelivery: 'Suivant : Mode de réception ›',
    searchBtn: 'Rechercher (135+)',
    searchModalTitle: 'Rechercher parmi 135+ langues',
    searchModalLabel: 'Nom, pays ou code de la langue',
    searchModalPlaceholder: 'ex. polonais, pl, japonais, ja, suédois, sv...',
    resetSearchBtn: 'Populaires (Top 25)',
    pageIndicator: (p, t) => (p === 0 ? `Populaires (1/${t})` : `Page ${p + 1}/${t}`),
    noSearchMatch: (q) => `Aucune langue trouvée pour "${q}".`,

    step2Title: 'Étape 2 sur 3 : Mode de réception',
    step2Desc:
      'Choisissez comment recevoir vos traductions (modes mutuellement exclusifs) :',
    threadName: 'Fil privé en direct (Par défaut et recommandé)',
    threadDesc:
      'Ouvre automatiquement un fil privé à côté du salon. Les traductions s affichent en temps réel.',
    threadDisabled: 'Désactivé par le serveur',
    threadStaffOnly: 'Réservé aux modérateurs',
    threadAvailable: 'Démarre automatiquement dans les salons (Sans commande)',
    threadBtn: 'Fil en direct',
    dmName: 'Messages privés (Flux MP)',
    dmDesc:
      'Les messages sont transférés directement dans vos MP. Remplace le fil en direct.',
    ephemeralName: 'À la demande (Manuel)',
    ephemeralDesc:
      'Pas de flux automatique. Les traductions apparaissent sur clic ou avec les drapeaux.',
    targetLangField: 'Langue cible',
    backLang: '‹ Retour : Langue',
    nextPrefs: 'Suivant : Réglages ›',

    step3Title: 'Étape 3 sur 3 : Réglages',
    step3Desc:
      'Vérifiez vos options d affichage avant de finaliser :',
    showOriginalField: 'Afficher texte original',
    showOriginalDesc: 'Insère la citation originale sous la traduction pour comparaison.',
    autoDeleteField: 'Suppression auto drapeaux',
    autoDeleteDesc: 'Les réponses par drapeaux s effacent après 3 minutes.',
    engineField: 'Moteur de traduction',
    engineDesc: 'Google Cloud assure des traductions rapides dans plus de 135 langues.',
    deliveryField: 'Mode sélectionné',
    enabled: 'Activé',
    disabled: 'Désactivé',
    originalToggle: (shown) => (shown ? 'Original : Affiché' : 'Original : Masqué'),
    engineToggle: (isDeepl) => (isDeepl ? 'Moteur : DeepL' : 'Moteur : Google Cloud'),
    backDelivery: '‹ Retour : Réception',
    completeBtn: 'Terminer la configuration',

    completionTitle: 'Configuration terminée',
    completionDesc:
      'Vos préférences sont enregistrées et chiffrées. Vous êtes prêt à échanger !',
    quickTipsTitle: 'Guide rapide',
    quickTipsContent: [
      '• Fil privé en direct : Fil parallèle automatique à côté du salon (Sans commande)',
      '• Clic droit sur un message › Apps › Traduire',
      '• Paramètres : Tapez /settings à tout moment',
    ].join('\n'),
    openSettingsBtn: 'Ouvrir les paramètres',
  },
  it: {
    interceptTitle: 'Benvenuto su Translation',
    interceptDesc: (user) =>
      `Ciao ${user}! Translation traduce i messaggi in tempo reale in un thread privato o su richiesta.\n\nFai clic sotto per adottare la lingua del tuo Discord o sceglierne un'altra manualmente:`,
    interceptPresetTitle: 'Configurazione consigliata',
    interceptPresetBody: [
      '• Modalità: Thread privato Live (Thread automatico)',
      '• Motore: Google Cloud (Veloce, oltre 135 lingue)',
      '• Eliminazione automatica: 3 minuti',
      '• Testo originale: Abilitato (Citazione di confronto)',
    ].join('\n'),
    detectClientBtn: 'Usa lingua di Discord',
    manualChooseBtn: 'Scegli manualmente',
    detectedLangField: 'Lingua rilevata',
    useQuickBtn: (lang) => `Usa ${lang} e inizia`,
    startSetupBtn: 'Personalizza impostazioni',
    cancelBtn: 'Chiudi',

    clientDetectedTitle: 'Lingua di Discord rilevata',
    clientDetectedDesc: (lang, code) =>
      `La tua lingua di Discord è: **${lang}** (\`${code}\`).\n\nVuoi usare questa lingua per le traduzioni o sceglierne un'altra?`,
    clientDetectedPreset: 'Configurazione consigliata',
    clientDetectedPresetBody: [
      '• Lingua di destinazione: Configurato',
      '• Modalità: Thread privato Live',
      '• Motore: Google Cloud',
      '• Eliminazione automatica: 3 minuti',
      '• Testo originale: Abilitato',
    ].join('\n'),
    useClientLangBtn: (lang) => `Usa ${lang} e continua ›`,
    chooseOtherLangBtn: 'Scegli un\'altra lingua',
    customizeSetupBtn: 'Personalizza configurazione',

    step1Title: 'Passo 1 di 3: Lingua principale',
    step1Desc:
      'Scegli la lingua in cui tradurre i messaggi stranieri. Il bot rileva automaticamente la lingua di Discord.',
    currentSelection: 'Selezione attuale',
    detectedLocale: 'Lingua Discord rilevata',
    selectPlaceholder: 'Seleziona la tua lingua preferita...',
    nextDelivery: 'Avanti: Modalità di ricezione ›',
    searchBtn: 'Cerca (135+)',
    searchModalTitle: 'Cerca tra 135+ lingue',
    searchModalLabel: 'Nome, paese o codice della lingua',
    searchModalPlaceholder: 'es. polacco, pl, giapponese, ja, svedese, sv...',
    resetSearchBtn: 'Popolari (Top 25)',
    pageIndicator: (p, t) => (p === 0 ? `Popolari (1/${t})` : `Pagina ${p + 1}/${t}`),
    noSearchMatch: (q) => `Nessuna lingua trovata per "${q}".`,

    step2Title: 'Passo 2 di 3: Modalità di ricezione',
    step2Desc:
      'Scegli come ricevere le traduzioni (opzioni mutualmente esclusive):',
    threadName: 'Thread privato Live (Predefinito e raccomandato)',
    threadDesc:
      'Apre automaticamente un thread privato accanto alla chat per traduzioni in tempo reale.',
    threadDisabled: 'Disattivato dal server',
    threadStaffOnly: 'Solo moderatori',
    threadAvailable: 'Si avvia automaticamente nei canali (Nessun comando necessario)',
    threadBtn: 'Thread Live',
    dmName: 'Messaggi Diretti (Feed DM)',
    dmDesc:
      'I messaggi vengono inviati direttamente nei tuoi DM privati. Sostituisce il thread live.',
    ephemeralName: 'Su richiesta (Manuale)',
    ephemeralDesc:
      'Nessun feed automatico. Le traduzioni compaiono solo al clic o con le bandiere.',
    targetLangField: 'Lingua di destinazione',
    backLang: '‹ Indietro: Lingua',
    nextPrefs: 'Avanti: Preferenze ›',

    step3Title: 'Passo 3 di 3: Preferenze',
    step3Desc:
      'Verifica le opzioni di visualizzazione prima di completare:',
    showOriginalField: 'Mostra testo originale',
    showOriginalDesc: 'Inserisce la citazione originale sotto la traduzione per confronto.',
    autoDeleteField: 'Eliminazione automatica bandiere',
    autoDeleteDesc: 'Le risposte con bandiere nei canali vengono eliminate dopo 3 minuti.',
    engineField: 'Motore di traduzione',
    engineDesc: 'Google Cloud garantisce traduzioni rapide in oltre 135 lingue.',
    deliveryField: 'Modalità selezionata',
    enabled: 'Abilitato',
    disabled: 'Disabilitato',
    originalToggle: (shown) => (shown ? 'Originale: Visibile' : 'Originale: Nascosto'),
    engineToggle: (isDeepl) => (isDeepl ? 'Motore: DeepL' : 'Motore: Google Cloud'),
    backDelivery: '‹ Indietro: Ricezione',
    completeBtn: 'Completa configurazione',

    completionTitle: 'Configurazione completata',
    completionDesc:
      'Le tue preferenze sono state salvate e crittografate. Sei pronto a comunicare!',
    quickTipsTitle: 'Guida rapida',
    quickTipsContent: [
      '• Thread privato Live: Thread parallelo automatico accanto alla chat (Senza comandi)',
      '• Clic destro su un messaggio › Apps › Translate',
      '• Impostazioni: Usa /settings in qualsiasi momento',
    ].join('\n'),
    openSettingsBtn: 'Apri impostazioni',
  },
};

export function getUILabels(langCode?: string): UILabels {
  if (!langCode) return UI_DICTIONARIES.en;
  const normalized = langCode.toLowerCase().trim();
  if (UI_DICTIONARIES[normalized]) return UI_DICTIONARIES[normalized];
  const primary = normalized.split('-')[0];
  if (UI_DICTIONARIES[primary]) return UI_DICTIONARIES[primary];
  return UI_DICTIONARIES.en;
}

export function getSetupLabels(langCode?: string): SetupLabels {
  if (!langCode) return SETUP_DICTIONARIES.en;
  const normalized = langCode.toLowerCase().trim();
  if (SETUP_DICTIONARIES[normalized]) return SETUP_DICTIONARIES[normalized];
  const primary = normalized.split('-')[0];
  if (SETUP_DICTIONARIES[primary]) return SETUP_DICTIONARIES[primary];
  return SETUP_DICTIONARIES.en;
}

const SETTINGS_DICTIONARIES: Record<string, SettingsLabels> = {
  en: {
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
    durationMinutes: (m) => `${m} minute${m > 1 ? 's' : ''}`,
    engineDeepl: 'DeepL (High Precision)',
    engineGoogle: 'Google Cloud (Fast & 135+ Languages)',
    enabled: 'Enabled',
    disabled: 'Disabled',
    toggleOriginal: (shown) => (shown ? 'Original: Hide' : 'Original: Show'),
    toggleEngine: (isDeepl) => (isDeepl ? 'Engine: Google Cloud' : 'Engine: DeepL'),
    btnModeThread: 'Live Thread',
    btnModeDm: 'DM-Feed',
    btnModeManual: 'On-Demand',
    dismissBtn: 'Done',
  },
  de: {
    title: 'Übersetzungseinstellungen',
    desc: 'Passe an, wie Übersetzungen für deinen Account formatiert und zugestellt werden.',
    targetLang: 'Zielsprache',
    targetLangDesc: 'In diese Sprache werden fremde Nachrichten standardmäßig übersetzt.',
    deliveryMode: 'Zustellmodus',
    modeThread: 'Privater Live-Thread (Empfohlen)',
    modeThreadDesc: 'Automatischer Feed im privaten Seiten-Thread neben dem Hauptchat.',
    modeDm: 'Direktnachrichten (DM-Feed)',
    modeDmDesc: 'Automatischer Feed direkt in deine privaten Bot-DMs.',
    modeManual: 'Auf Abruf (Manuell)',
    modeManualDesc: 'Kein Auto-Feed. Übersetzungen nur bei Klick oder Flaggen-Reaktion.',
    showOriginal: 'Originaltext anzeigen',
    showOriginalDesc: 'Blendet das Ursprungszitat zum Vergleichen unter der Übersetzung ein.',
    autoDelete: 'Automatisch löschen',
    autoDeleteDesc: 'Dauer von Flaggen-Antworten im Kanal vor dem Aufräumen (Standard: 3 Min).',
    defaultEngine: 'Standard-Engine',
    defaultEngineDesc: 'Google Cloud (135+ Sprachen) oder DeepL (Linguistische Finesse).',
    footer: 'Änderungen gelten sofort und werden verschlüsselt gespeichert.',
    langPlaceholder: 'Standard-Zielsprache wählen...',
    durationPlaceholder: 'Löschdauer auswählen...',
    durationPermanent: 'Dauerhaft (Kein automatisches Löschen)',
    durationMinutes: (m) => `${m} Minute${m > 1 ? 'n' : ''}`,
    engineDeepl: 'DeepL (Hohe Präzision)',
    engineGoogle: 'Google Cloud (Schnell & 135+ Sprachen)',
    enabled: 'Aktiviert',
    disabled: 'Deaktiviert',
    toggleOriginal: (shown) => (shown ? 'Original: Ausblenden' : 'Original: Anzeigen'),
    toggleEngine: (isDeepl) => (isDeepl ? 'Engine: Google Cloud' : 'Engine: DeepL'),
    btnModeThread: 'Live-Thread',
    btnModeDm: 'DM-Feed',
    btnModeManual: 'Auf Abruf',
    dismissBtn: 'Fertig',
  },
  es: {
    title: 'Ajustes de traducción',
    desc: 'Personaliza cómo se entregan y muestran las traducciones para tu cuenta.',
    targetLang: 'Idioma destino',
    targetLangDesc: 'Los mensajes extranjeros se traducen a este idioma por defecto.',
    deliveryMode: 'Modo de entrega',
    modeThread: 'Hilo privado en vivo (Recomendado)',
    modeThreadDesc: 'Transmisión automática en vivo en un hilo privado junto al chat.',
    modeDm: 'Mensajes Directos (Feed MD)',
    modeDmDesc: 'Transmisión automática directa a tus MD privados de Discord.',
    modeManual: 'A petición (Manual)',
    modeManualDesc: 'Sin feeds automáticos. Traducciones solo al hacer clic o con banderas.',
    showOriginal: 'Mostrar original',
    showOriginalDesc: 'Incluye la cita de referencia bajo la traducción.',
    autoDelete: 'Auto-eliminación',
    autoDeleteDesc: 'Tiempo que permanecen las respuestas de banderas en el canal (Predeterminado: 3 min).',
    defaultEngine: 'Motor predeterminado',
    defaultEngineDesc: 'Google Cloud (135+ idiomas) o DeepL (Alta precisión).',
    footer: 'Los cambios se aplican al instante y se guardan cifrados.',
    langPlaceholder: 'Elige el idioma predeterminado...',
    durationPlaceholder: 'Elige la duración...',
    durationPermanent: 'Permanente (Sin auto-eliminación)',
    durationMinutes: (m) => `${m} minuto${m > 1 ? 's' : ''}`,
    engineDeepl: 'DeepL (Alta precisión)',
    engineGoogle: 'Google Cloud (Rápido y 135+ idiomas)',
    enabled: 'Activado',
    disabled: 'Desactivado',
    toggleOriginal: (shown) => (shown ? 'Original: Ocultar' : 'Original: Mostrar'),
    toggleEngine: (isDeepl) => (isDeepl ? 'Motor: Google Cloud' : 'Motor: DeepL'),
    btnModeThread: 'Hilo en vivo',
    btnModeDm: 'Feed MD',
    btnModeManual: 'A petición',
    dismissBtn: 'Listo',
  },
  fr: {
    title: 'Paramètres de traduction',
    desc: 'Personnalisez le format et la réception de vos traductions.',
    targetLang: 'Langue cible',
    targetLangDesc: 'Les messages étrangers sont traduits vers cette langue par défaut.',
    deliveryMode: 'Mode de réception',
    modeThread: 'Fil privé en direct (Recommandé)',
    modeThreadDesc: 'Flux automatique en temps réel dans un fil privé à côté du chat.',
    modeDm: 'Messages privés (Flux MP)',
    modeDmDesc: 'Flux automatique envoyé directement dans vos MP Discord privés.',
    modeManual: 'À la demande (Manuel)',
    modeManualDesc: 'Pas de flux auto. Traductions uniquement sur clic ou via drapeaux.',
    showOriginal: 'Texte original',
    showOriginalDesc: 'Affiche la citation originale sous la traduction pour comparaison.',
    autoDelete: 'Suppression auto drapeaux',
    autoDeleteDesc: 'Durée avant nettoyage des réponses drapeaux dans le salon (Défaut : 3 min).',
    defaultEngine: 'Moteur par défaut',
    defaultEngineDesc: 'Google Cloud (135+ langues) ou DeepL (Précision linguistique).',
    footer: 'Modifications appliquées immédiatement et chiffrées.',
    langPlaceholder: 'Choisir la langue cible...',
    durationPlaceholder: 'Choisir la durée...',
    durationPermanent: 'Permanent (Ne s efface jamais)',
    durationMinutes: (m) => `${m} minute${m > 1 ? 's' : ''}`,
    engineDeepl: 'DeepL (Haute précision)',
    engineGoogle: 'Google Cloud (Rapide & 135+ Langues)',
    enabled: 'Activé',
    disabled: 'Désactivé',
    toggleOriginal: (shown) => (shown ? 'Original : Masquer' : 'Original : Afficher'),
    toggleEngine: (isDeepl) => (isDeepl ? 'Moteur : Google Cloud' : 'Moteur : DeepL'),
    btnModeThread: 'Fil en direct',
    btnModeDm: 'Flux MP',
    btnModeManual: 'À la demande',
    dismissBtn: 'Terminé',
  },
  it: {
    title: 'Impostazioni traduzione',
    desc: 'Personalizza come ricevere e visualizzare le traduzioni per il tuo account.',
    targetLang: 'Lingua di destinazione',
    targetLangDesc: 'I messaggi stranieri vengono tradotti in questa lingua per impostazione predefinita.',
    deliveryMode: 'Modalità di ricezione',
    modeThread: 'Thread privato Live (Raccomandato)',
    modeThreadDesc: 'Flusso automatico in tempo reale in un thread privato accanto alla chat.',
    modeDm: 'Messaggi Diretti (Feed DM)',
    modeDmDesc: 'Flusso automatico inviato direttamente nei tuoi DM privati di Discord.',
    modeManual: 'Su richiesta (Manuale)',
    modeManualDesc: 'Nessun feed automatico. Traduzioni solo su clic o con bandiere.',
    showOriginal: 'Mostra originale',
    showOriginalDesc: 'Include la citazione originale sotto la traduzione per confronto.',
    autoDelete: 'Eliminazione automatica',
    autoDeleteDesc: 'Tempo di permanenza delle risposte con bandiere nel canale (Predefinito: 3 min).',
    defaultEngine: 'Motore predefinito',
    defaultEngineDesc: 'Google Cloud (135+ lingue) o DeepL (Alta precisione).',
    footer: 'Le modifiche hanno effetto immediato e sono crittografate.',
    langPlaceholder: 'Seleziona lingua di destinazione...',
    durationPlaceholder: 'Seleziona durata...',
    durationPermanent: 'Permanente (Non si cancella mai)',
    durationMinutes: (m) => `${m} minut${m > 1 ? 'i' : 'o'}`,
    engineDeepl: 'DeepL (Alta precisione)',
    engineGoogle: 'Google Cloud (Veloce & 135+ Lingue)',
    enabled: 'Abilitato',
    disabled: 'Disabilitato',
    toggleOriginal: (shown) => (shown ? 'Originale : Nascondi' : 'Originale : Mostra'),
    toggleEngine: (isDeepl) => (isDeepl ? 'Motore: Google Cloud' : 'Motore: DeepL'),
    btnModeThread: 'Thread Live',
    btnModeDm: 'Feed DM',
    btnModeManual: 'Su richiesta',
    dismissBtn: 'Fatto',
  },
};

export function getSettingsLabels(langCode?: string): SettingsLabels {
  if (!langCode) return SETTINGS_DICTIONARIES.en;
  const normalized = langCode.toLowerCase().trim();
  if (SETTINGS_DICTIONARIES[normalized]) return SETTINGS_DICTIONARIES[normalized];
  const primary = normalized.split('-')[0];
  if (SETTINGS_DICTIONARIES[primary]) return SETTINGS_DICTIONARIES[primary];
  return SETTINGS_DICTIONARIES.en;
}

const SERVER_DICTIONARIES: Record<string, ServerLabels> = {
  en: {
    title: 'Server Translation Guardrails',
    desc: 'Control how translations operate server-wide to prevent members from flooding public channels.',
    threadsField: 'Live Translation Threads',
    threadsExplain: 'Controls who can open real-time side-threads in channels.',
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
    threadsBtnLabel: (scope) => `Threads: ${scope === 'disabled' ? 'Disabled' : scope === 'admin_only' ? 'Admins Only' : 'Everyone'}`,
    publicBtnLabel: (scope) => `Public: ${scope === 'disabled' ? 'Disabled' : scope === 'admin_only' ? 'Admins Only' : 'Everyone'}`,
    flagsBtnLabel: (allowed) => (allowed ? 'Flags: Enabled' : 'Flags: Disabled'),
    dismissBtn: 'Dismiss',
  },
  de: {
    title: 'Server-Übersetzungs-Guardrails',
    desc: 'Steuere serverweit, wer Übersetzungen nutzen darf, um Kanalflutung zu verhindern.',
    threadsField: 'Live-Übersetzungs-Threads',
    threadsExplain: 'Bestimmt, wer private Live-Threads in Kanälen öffnen darf.',
    publicField: 'Öffentliche Kanal-Übersetzungen',
    publicExplain: 'Bestimmt, wer dauerhafte Übersetzungen im Kanal posten darf.',
    flagsField: 'Flaggen-Reaktionen',
    flagsExplain: 'Bestimmt, ob Flaggen-Reaktionen eine Kanal-Antwort mit Auto-Löschen auslösen.',
    footer: 'Änderungen gelten sofort für alle Kanäle auf diesem Server.',
    threadsDisabled: 'Deaktiviert (Keine Threads erlaubt)',
    threadsAdminsOnly: 'Nur Admins (Sicherer Standard)',
    threadsEveryone: 'Jeder',
    publicDisabled: 'Deaktiviert (Nur Flüchtig)',
    publicAdminsOnly: 'Nur Admins (Sicherer Standard)',
    publicEveryone: 'Jeder',
    flagsDisabled: 'Deaktiviert (Keine Antworten)',
    flagsDmsOnly: 'Deaktiviert (Keine Antworten)',
    flagsChannelAllowed: 'Aktiviert (Kanal-Antwort)',
    threadsBtnLabel: (scope) => `Threads: ${scope === 'disabled' ? 'Aus' : scope === 'admin_only' ? 'Nur Admins' : 'Jeder'}`,
    publicBtnLabel: (scope) => `Öffentlich: ${scope === 'disabled' ? 'Aus' : scope === 'admin_only' ? 'Nur Admins' : 'Jeder'}`,
    flagsBtnLabel: (allowed) => (allowed ? 'Flaggen: Aktiviert' : 'Flaggen: Deaktiviert'),
    dismissBtn: 'Schließen',
  },
  es: {
    title: 'Reglas de traducción del servidor',
    desc: 'Controla el uso de traducciones para evitar la saturación de los canales públicos.',
    threadsField: 'Hilos de traducción en vivo',
    threadsExplain: 'Controla quién puede abrir hilos paralelos en vivo.',
    publicField: 'Traducciones públicas en canales',
    publicExplain: 'Controla quién puede publicar traducciones permanentes.',
    flagsField: 'Reacciones con banderas',
    flagsExplain: 'Controla si las reacciones con bandera responden en el canal.',
    footer: 'Los cambios se aplican de inmediato en todo el servidor.',
    threadsDisabled: 'Desactivado (Sin hilos)',
    threadsAdminsOnly: 'Solo Admins (Seguro)',
    threadsEveryone: 'Todos',
    publicDisabled: 'Desactivado (Solo efímero)',
    publicAdminsOnly: 'Solo Admins (Seguro)',
    publicEveryone: 'Todos',
    flagsDisabled: 'Desactivado (Sin respuestas)',
    flagsDmsOnly: 'Desactivado (Sin respuestas)',
    flagsChannelAllowed: 'Activado (Respuesta en canal)',
    threadsBtnLabel: (scope) => `Hilos: ${scope === 'disabled' ? 'Desactivado' : scope === 'admin_only' ? 'Solo Admins' : 'Todos'}`,
    publicBtnLabel: (scope) => `Público: ${scope === 'disabled' ? 'Desactivado' : scope === 'admin_only' ? 'Solo Admins' : 'Todos'}`,
    flagsBtnLabel: (allowed) => (allowed ? 'Banderas: Activado' : 'Banderas: Desactivado'),
    dismissBtn: 'Descartar',
  },
  fr: {
    title: 'Règles de traduction du serveur',
    desc: 'Contrôlez les traductions pour éviter l encombrement des salons publics.',
    threadsField: 'Fils de traduction en direct',
    threadsExplain: 'Détermine qui peut ouvrir des fils de traduction en direct.',
    publicField: 'Traductions publiques',
    publicExplain: 'Détermine qui peut publier des traductions visibles par tous.',
    flagsField: 'Réactions par drapeau',
    flagsExplain: 'Détermine si les réactions par drapeau publient une réponse dans le salon.',
    footer: 'Modifications appliquées immédiatement sur tout le serveur.',
    threadsDisabled: 'Désactivé (Aucun fil)',
    threadsAdminsOnly: 'Modérateurs uniquement',
    threadsEveryone: 'Tout le monde',
    publicDisabled: 'Désactivé (Éphémère uniquement)',
    publicAdminsOnly: 'Modérateurs uniquement',
    publicEveryone: 'Tout le monde',
    flagsDisabled: 'Désactivé (Pas de réponse)',
    flagsDmsOnly: 'Désactivé (Pas de réponse)',
    flagsChannelAllowed: 'Activé (Réponse dans le salon)',
    threadsBtnLabel: (scope) => `Fils : ${scope === 'disabled' ? 'Désactivé' : scope === 'admin_only' ? 'Modos seuls' : 'Tous'}`,
    publicBtnLabel: (scope) => `Public : ${scope === 'disabled' ? 'Désactivé' : scope === 'admin_only' ? 'Modos seuls' : 'Tous'}`,
    flagsBtnLabel: (allowed) => (allowed ? 'Drapeaux : Activé' : 'Drapeaux : Désactivé'),
    dismissBtn: 'Fermer',
  },
  it: {
    title: 'Regole traduzione del server',
    desc: 'Controlla le traduzioni per evitare lo spam nei canali pubblici.',
    threadsField: 'Thread di traduzione Live',
    threadsExplain: 'Controlla chi può aprire thread live nei canali.',
    publicField: 'Traduzioni pubbliche nei canali',
    publicExplain: 'Controlla chi può pubblicare traduzioni permanenti.',
    flagsField: 'Reazioni con bandiere',
    flagsExplain: 'Controlla se le reazioni con bandiere inviano una risposta nel canale.',
    footer: 'Le modifiche hanno effetto immediato su tutto il server.',
    threadsDisabled: 'Disattivato (Nessun thread)',
    threadsAdminsOnly: 'Solo Admin (Sicuro)',
    threadsEveryone: 'Tutti',
    publicDisabled: 'Disattivato (Solo effimero)',
    publicAdminsOnly: 'Solo Admin (Sicuro)',
    publicEveryone: 'Tutti',
    flagsDisabled: 'Disattivato (Nessuna risposta)',
    flagsDmsOnly: 'Disattivato (Nessuna risposta)',
    flagsChannelAllowed: 'Attivato (Risposta nel canale)',
    threadsBtnLabel: (scope) => `Thread: ${scope === 'disabled' ? 'Disattivato' : scope === 'admin_only' ? 'Solo Admin' : 'Tutti'}`,
    publicBtnLabel: (scope) => `Pubblico: ${scope === 'disabled' ? 'Disattivato' : scope === 'admin_only' ? 'Solo Admin' : 'Tutti'}`,
    flagsBtnLabel: (allowed) => (allowed ? 'Bandiere: Attivato' : 'Bandiere: Disattivato'),
    dismissBtn: 'Chiudi',
  },
};

export function getServerLabels(langCode?: string): ServerLabels {
  if (!langCode) return SERVER_DICTIONARIES.en;
  const normalized = langCode.toLowerCase().trim();
  if (SERVER_DICTIONARIES[normalized]) return SERVER_DICTIONARIES[normalized];
  const primary = normalized.split('-')[0];
  if (SERVER_DICTIONARIES[primary]) return SERVER_DICTIONARIES[primary];
  return SERVER_DICTIONARIES.en;
}

const HELP_DICTIONARIES: Record<string, HelpLabels> = {
  en: {
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
  },
  de: {
    title: 'Übersetzungs-Anleitung',
    desc: 'Hochgeschwindigkeits-Übersetzungs-Bot powered by Google Cloud Translation & DeepL.',
    sectionPrivate: 'Privater Live-Thread (Empfohlen)',
    sectionPrivateBody:
      'Öffnet einen privaten Thread neben dem Chat. Fremde Nachrichten werden automatisch in Echtzeit übersetzt, ohne den Hauptchat zu stören.',
    sectionFlags: 'Flaggen-Reaktionen',
    sectionFlagsBody:
      'Reagiere auf eine Nachricht mit einer Länderflagge (z.B. 🇩🇪, 🇬🇧, 🇯🇵), um sie sofort in diese Sprache zu übersetzen.',
    sectionDirect: 'Direkt & Kontextmenü',
    sectionDirectBody:
      'Rechtsklick auf eine Nachricht › Apps › Übersetzen, oder nutze den Befehl /translate.',
    sectionPrefs: 'Persönliche Einstellungen',
    sectionPrefsBody:
      'Tippe /settings, um deine Zielsprache, Zustellungsart oder KI-Engine anzupassen.',
    sectionServer: 'Server-Guardrails',
    sectionServerBody:
      'Server-Admins können mit /server-settings Berechtigungen steuern und Kanalflutung verhindern.',
    openSettingsBtn: 'Einstellungen öffnen',
  },
  es: {
    title: 'Guía de traducción',
    desc: 'Bot de traducción de alta velocidad con tecnología de Google Cloud y DeepL.',
    sectionPrivate: 'Hilo privado en vivo (Recomendado)',
    sectionPrivateBody:
      'Crea un hilo privado junto al chat. Los mensajes extranjeros se traducen automáticamente en tiempo real.',
    sectionFlags: 'Reacciones con banderas',
    sectionFlagsBody:
      'Reacciona a cualquier mensaje con la bandera de un país (ej. 🇩🇪, 🇬🇧, 🇯🇵) para traducirlo.',
    sectionDirect: 'Menú contextual y directo',
    sectionDirectBody:
      'Clic derecho en un mensaje › Apps › Traducir, o usa el comando /translate.',
    sectionPrefs: 'Preferencias personales',
    sectionPrefsBody:
      'Escribe /settings para cambiar tu idioma destino, modo de entrega o motor de IA.',
    sectionServer: 'Reglas del servidor',
    sectionServerBody:
      'Los administradores pueden usar /server-settings para controlar permisos.',
    openSettingsBtn: 'Abrir ajustes',
  },
  fr: {
    title: 'Guide d utilisation',
    desc: 'Bot de traduction ultra-rapide propulsé par Google Cloud Translation et DeepL.',
    sectionPrivate: 'Fil privé en direct (Recommandé)',
    sectionPrivateBody:
      'Ouvre un fil privé à côté du salon. Les messages sont traduits en temps réel sans encombrer le chat.',
    sectionFlags: 'Réactions drapeaux',
    sectionFlagsBody:
      'Réagissez à un message avec un drapeau (ex. 🇩🇪, 🇬🇧, 🇯🇵) pour le traduire immédiatement.',
    sectionDirect: 'Direct et menu contextuel',
    sectionDirectBody:
      'Clic droit sur un message › Apps › Traduire, ou utilisez la commande /translate.',
    sectionPrefs: 'Préférences personnelles',
    sectionPrefsBody:
      'Tapez /settings pour modifier votre langue cible, votre mode de réception ou le moteur.',
    sectionServer: 'Règles du serveur',
    sectionServerBody:
      'Les modérateurs peuvent taper /server-settings pour gérer les autorisations.',
    openSettingsBtn: 'Ouvrir les paramètres',
  },
  it: {
    title: 'Guida all uso',
    desc: 'Bot di traduzione ad alta velocità basato su Google Cloud Translation e DeepL.',
    sectionPrivate: 'Thread privato Live (Raccomandato)',
    sectionPrivateBody:
      'Crea un thread privato accanto alla chat per traduzioni in tempo reale senza intasare il canale.',
    sectionFlags: 'Reazioni con bandiere',
    sectionFlagsBody:
      'Reagisci a un messaggio con la bandiera di un paese (es. 🇩🇪, 🇬🇧, 🇯🇵) per tradurlo all istante.',
    sectionDirect: 'Diretto e menu contestuale',
    sectionDirectBody:
      'Clic destro su un messaggio › Apps › Traduci, oppure usa il comando /translate.',
    sectionPrefs: 'Preferenze personali',
    sectionPrefsBody:
      'Digita /settings per modificare la lingua di destinazione o la modalità di ricezione.',
    sectionServer: 'Regole del server',
    sectionServerBody:
      'I gestori del server possono digitare /server-settings per controllare i permessi.',
    openSettingsBtn: 'Apri impostazioni',
  },
};

export function getHelpLabels(langCode?: string): HelpLabels {
  if (!langCode) return HELP_DICTIONARIES.en;
  const normalized = langCode.toLowerCase().trim();
  if (HELP_DICTIONARIES[normalized]) return HELP_DICTIONARIES[normalized];
  const primary = normalized.split('-')[0];
  if (HELP_DICTIONARIES[primary]) return HELP_DICTIONARIES[primary];
  return HELP_DICTIONARIES.en;
}
