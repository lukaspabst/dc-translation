import { SetupLabels } from './localeTypes';

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
      'Choose your automatic feed (Live Thread and DM feeds cannot run simultaneously). Flag reactions and right-click translations always work in any mode:',
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
      'Wähle deinen automatischen Feed (Live-Thread und DMs können nicht gleichzeitig laufen). Flaggen-Reaktionen und Rechtsklick-Übersetzungen funktionieren immer zusätzlich in jedem Modus:',
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
      'Kein automatischer Stream. Übersetzungen erhältst du gezielt per Flaggen-Reaktion oder Rechtsklick.',
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
      'Elige tu feed automático (el hilo en vivo y los MD no pueden funcionar a la vez). Las reacciones con banderas y traducciones por clic siempre funcionan en cualquier modo:',
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
      'Sin transmisiones automáticas. Las traducciones aparecen al hacer clic o con banderas.',
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
      'Choisissez votre flux automatique (le fil en direct et les MP ne peuvent pas fonctionner simultanément). Les réactions avec drapeaux et traductions par clic restent toujours actives dans tous les modes :',
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
      'Scegli il tuo feed automatico (il thread live e i DM non possono funzionare contemporaneamente). Le reazioni con bandiere e le traduzioni con clic funzionano sempre in ogni modalità:',
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
  ru: {
    interceptTitle: 'Добро пожаловать в Translation',
    interceptDesc: (user) =>
      `Привет, ${user}! Translation переводит входящие сообщения в реальном времени в личной ветке или по запросу.\n\nНажмите ниже, чтобы использовать язык вашего Discord, или выберите вручную:`,
    interceptPresetTitle: 'Рекомендуемая конфигурация',
    interceptPresetBody: [
      '• Режим: Личная ветка (Автоматическая ветка рядом с чатом)',
      '• Движок: Google Cloud (Быстро, 135+ языков)',
      '• Автоудаление: 3 минуты (Чистый канал)',
      '• Оригинал: Включено (Цитата для сравнения)',
    ].join('\n'),
    detectClientBtn: 'Использовать язык Discord',
    manualChooseBtn: 'Выбрать язык вручную',
    detectedLangField: 'Обнаруженный язык',
    useQuickBtn: (lang) => `Использовать ${lang} и начать`,
    startSetupBtn: 'Настроить параметры',
    cancelBtn: 'Закрыть',

    clientDetectedTitle: 'Обнаружен язык Discord',
    clientDetectedDesc: (lang, code) =>
      `Язык вашего Discord: **${lang}** (\`${code}\`).\n\nИспользовать этот язык для переводов или выбрать другой?`,
    clientDetectedPreset: 'Рекомендуемая конфигурация',
    clientDetectedPresetBody: [
      '• Целевой язык: Настроен',
      '• Режим: Личная ветка (Персональная)',
      '• Движок: Google Cloud',
      '• Автоудаление: 3 минуты',
      '• Оригинал: Включено',
    ].join('\n'),
    useClientLangBtn: (lang) => `Использовать ${lang} и продолжить ›`,
    chooseOtherLangBtn: 'Выбрать другой язык',
    customizeSetupBtn: 'Настроить параметры',

    step1Title: 'Шаг 1 из 3: Основной язык',
    step1Desc:
      'Выберите язык, на который будут переводиться сообщения по умолчанию. Бот автоматически определяет язык вашего Discord.',
    currentSelection: 'Текущий выбор',
    detectedLocale: 'Язык клиента Discord',
    selectPlaceholder: 'Выберите предпочитаемый язык...',
    nextDelivery: 'Далее: Режим доставки ›',
    searchBtn: 'Поиск (135+)',
    searchModalTitle: 'Поиск среди 135+ языков',
    searchModalLabel: 'Название языка, страна или код',
    searchModalPlaceholder: 'напр. польский, pl, японский, ja, шведский, sv...',
    resetSearchBtn: 'Популярные (Топ-25)',
    pageIndicator: (p, t) => (p === 0 ? `Популярные (1/${t})` : `Страница ${p + 1}/${t}`),
    noSearchMatch: (q) => `Язык по запросу "${q}" не найден. Попробуйте код или название.`,

    step2Title: 'Шаг 2 из 3: Режим доставки',
    step2Desc:
      'Выберите автопоток (личная ветка и ЛС не могут работать одновременно). Переводы по реакциям с флажками и клику работают всегда в любом режиме:',
    threadName: 'Личная ветка (По умолчанию и рекомендуется)',
    threadDesc:
      'Автоматически открывает личную ветку рядом с чатом для перевода в реальном времени.',
    threadDisabled: 'Отключено администрацией сервера',
    threadStaffOnly: 'Только для модераторов',
    threadAvailable: 'Запускается автоматически в каналах (Без команд)',
    threadBtn: 'Личная ветка',
    dmName: 'Личные сообщения (ЛС-лента)',
    dmDesc:
      'Переводы приходят прямо в личные сообщения бота. Заменяет личную ветку.',
    ephemeralName: 'По запросу (Вручную)',
    ephemeralDesc:
      'Без автопотока. Переводы появляются только по клику или флажкам.',
    targetLangField: 'Целевой язык',
    backLang: '‹ Назад: Язык',
    nextPrefs: 'Далее: Параметры ›',

    step3Title: 'Шаг 3 из 3: Параметры',
    step3Desc:
      'Проверьте параметры перед завершением:',
    showOriginalField: 'Показывать оригинал',
    showOriginalDesc: 'Добавляет оригинальный текст цитатой под переводом.',
    autoDeleteField: 'Автоудаление по флажкам',
    autoDeleteDesc: 'Ответы по флажкам в канале удаляются через 3 минуты.',
    engineField: 'Движок перевода',
    engineDesc: 'Google Cloud обеспечивает быстрый перевод на 135+ языков.',
    deliveryField: 'Выбранный режим',
    enabled: 'Включено',
    disabled: 'Отключено',
    originalToggle: (shown) => (shown ? 'Оригинал: Показ' : 'Оригинал: Скрыт'),
    engineToggle: (isDeepl) => (isDeepl ? 'Движок: DeepL' : 'Движок: Google Cloud'),
    backDelivery: '‹ Назад: Доставка',
    completeBtn: 'Завершить настройку',

    completionTitle: 'Настройка завершена',
    completionDesc:
      'Ваши предпочтения сохранены и зашифрованы. Приятного общения!',
    quickTipsTitle: 'Быстрый старт',
    quickTipsContent: [
      '• Личная ветка: Автоматическая ветка рядом с чатом (Без команд)',
      '• Клик правой кнопкой на сообщение › Приложения › Перевести',
      '• Настройки: Введите /settings в любое время',
    ].join('\n'),
    openSettingsBtn: 'Открыть настройки',
  },
  uk: {
    interceptTitle: 'Ласкаво просимо до Translation',
    interceptDesc: (user) =>
      `Привіт, ${user}! Translation перекладає повідомлення в реальному часі в особистій гілці або за запитом.\n\nНатисніть нижче, щоб використати мову вашого Discord, або оберіть вручну:`,
    interceptPresetTitle: 'Рекомендована конфігурація',
    interceptPresetBody: [
      '• Режим: Особиста гілка (Автоматична гілка поруч із чатом)',
      '• Двигун: Google Cloud (Швидко, 135+ мов)',
      '• Автовидалення: 3 хвилини (Чистий канал)',
      '• Оригінал: Увімкнено (Цитата для порівняння)',
    ].join('\n'),
    detectClientBtn: 'Використати мову Discord',
    manualChooseBtn: 'Обрати мову вручну',
    detectedLangField: 'Виявлена мова',
    useQuickBtn: (lang) => `Використати ${lang} і почати`,
    startSetupBtn: 'Налаштувати параметри',
    cancelBtn: 'Закрити',

    clientDetectedTitle: 'Виявлено мову Discord',
    clientDetectedDesc: (lang, code) =>
      `Мова вашого Discord: **${lang}** (\`${code}\`).\n\nВикористовувати цю мову для перекладів чи обрати іншу?`,
    clientDetectedPreset: 'Рекомендована конфігурація',
    clientDetectedPresetBody: [
      '• Цільова мова: Налаштовано',
      '• Режим: Особиста гілка (Персональна)',
      '• Двигун: Google Cloud',
      '• Автовидалення: 3 хвилини',
      '• Оригінал: Увімкнено',
    ].join('\n'),
    useClientLangBtn: (lang) => `Використати ${lang} і продовжити ›`,
    chooseOtherLangBtn: 'Обрати іншу мову',
    customizeSetupBtn: 'Налаштувати параметри',

    step1Title: 'Крок 1 з 3: Основна мова',
    step1Desc:
      'Оберіть мову, на яку будуть перекладатися повідомлення за замовчуванням. Бот автоматично визначає мову вашого Discord.',
    currentSelection: 'Поточний вибір',
    detectedLocale: 'Мова клієнта Discord',
    selectPlaceholder: 'Оберіть бажану мову...',
    nextDelivery: 'Далі: Режим доставки ›',
    searchBtn: 'Пошук (135+)',
    searchModalTitle: 'Пошук серед 135+ мов',
    searchModalLabel: 'Назва мови, країна або код',
    searchModalPlaceholder: 'напр. польська, pl, японська, ja, шведська, sv...',
    resetSearchBtn: 'Популярні (Топ-25)',
    pageIndicator: (p, t) => (p === 0 ? `Популярні (1/${t})` : `Сторінка ${p + 1}/${t}`),
    noSearchMatch: (q) => `Мову за запитом "${q}" не знайдено. Спробуйте код або назву.`,

    step2Title: 'Крок 2 з 3: Режим доставки',
    step2Desc:
      'Оберіть автопотік (особиста гілка та ПП не можуть працювати одночасно). Переклади за реакціями з прапорцями та кліком працюють завжди в будь-якому режимі:',
    threadName: 'Особиста гілка (За замовчуванням і рекомендовано)',
    threadDesc:
      'Автоматично відкриває особисту гілку поруч із чатом для перекладу в реальному часі.',
    threadDisabled: 'Вимкнено адміністрацією сервера',
    threadStaffOnly: 'Лише для модераторів',
    threadAvailable: 'Запускається автоматично в каналах (Без команд)',
    threadBtn: 'Особиста гілка',
    dmName: 'Особисті повідомлення (ПП-стрічка)',
    dmDesc:
      'Переклади надходять прямо в приватні повідомлення бота. Замінює особисту гілку.',
    ephemeralName: 'За запитом (Вручну)',
    ephemeralDesc:
      'Без автопотоку. Переклади з’являються лише за кліком або прапорцями.',
    targetLangField: 'Цільова мова',
    backLang: '‹ Назад: Мова',
    nextPrefs: 'Далі: Параметри ›',

    step3Title: 'Крок 3 з 3: Параметри',
    step3Desc:
      'Перевірте параметри перед завершенням:',
    showOriginalField: 'Показувати оригінал',
    showOriginalDesc: 'Додає оригінальний текст цитатою під перекладом.',
    autoDeleteField: 'Автовидалення прапорців',
    autoDeleteDesc: 'Відповіді за прапорцями в каналі видаляються через 3 хвилини.',
    engineField: 'Двигун перекладу',
    engineDesc: 'Google Cloud забезпечує швидкий переклад на 135+ мов.',
    deliveryField: 'Обраний режим',
    enabled: 'Увімкнено',
    disabled: 'Вимкнено',
    originalToggle: (shown) => (shown ? 'Оригінал: Показ' : 'Оригінал: Приховано'),
    engineToggle: (isDeepl) => (isDeepl ? 'Двигун: DeepL' : 'Двигун: Google Cloud'),
    backDelivery: '‹ Назад: Доставка',
    completeBtn: 'Завершити налаштування',

    completionTitle: 'Налаштування завершено',
    completionDesc:
      'Ваші параметри збережено та зашифровано. Приємного спілкування!',
    quickTipsTitle: 'Швидкий старт',
    quickTipsContent: [
      '• Особиста гілка: Автоматична гілка поруч із чатом (Без команд)',
      '• Клік правою кнопкою на повідомлення › Додатки › Перекласти',
      '• Налаштування: Введіть /settings у будь-який час',
    ].join('\n'),
    openSettingsBtn: 'Відкрити налаштування',
  },
};


export function getSetupLabels(langCode?: string): SetupLabels {
  if (!langCode) return SETUP_DICTIONARIES.en;
  const normalized = langCode.toLowerCase().trim();
  if (SETUP_DICTIONARIES[normalized]) return SETUP_DICTIONARIES[normalized];
  const primary = normalized.split('-')[0];
  if (SETUP_DICTIONARIES[primary]) return SETUP_DICTIONARIES[primary];
  return SETUP_DICTIONARIES.en;
}
