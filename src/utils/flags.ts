export interface LanguageChoice {
  code: string;
  name: string;
  flag: string;
}

export const ALL_SUPPORTED_LANGUAGES: readonly LanguageChoice[] = [
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
  { code: 'as', name: 'Assamese', flag: '🇮🇳' },
  { code: 'ay', name: 'Aymara', flag: '🇧🇴' },
  { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  { code: 'bm', name: 'Bambara', flag: '🇲🇱' },
  { code: 'eu', name: 'Basque', flag: '🇪🇸' },
  { code: 'be', name: 'Belarusian', flag: '🇧🇾' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'bho', name: 'Bhojpuri', flag: '🇮🇳' },
  { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
  { code: 'ceb', name: 'Cebuano', flag: '🇵🇭' },
  { code: 'ny', name: 'Chichewa', flag: '🇲🇼' },
  { code: 'zh-cn', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-tw', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'co', name: 'Corsican', flag: '🇫🇷' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'dv', name: 'Dhivehi', flag: '🇲🇻' },
  { code: 'doi', name: 'Dogri', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'eo', name: 'Esperanto', flag: '🌐' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'ee', name: 'Ewe', flag: '🇬🇭' },
  { code: 'tl', name: 'Filipino (Tagalog)', flag: '🇵🇭' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'fy', name: 'Frisian', flag: '🇳🇱' },
  { code: 'gl', name: 'Galician', flag: '🇪🇸' },
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'gn', name: 'Guarani', flag: '🇵🇾' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'ht', name: 'Haitian Creole', flag: '🇭🇹' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'haw', name: 'Hawaiian', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'hmn', name: 'Hmong', flag: '🌐' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'ilo', name: 'Ilocano', flag: '🇵🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ga', name: 'Irish', flag: '🇮🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'jv', name: 'Javanese', flag: '🇮🇩' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
  { code: 'km', name: 'Khmer', flag: '🇰🇭' },
  { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'gom', name: 'Konkani', flag: '🇮🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'kri', name: 'Krio', flag: '🇸🇱' },
  { code: 'ku', name: 'Kurdish (Kurmanji)', flag: '🇹🇷' },
  { code: 'ckb', name: 'Kurdish (Sorani)', flag: '🇮🇶' },
  { code: 'ky', name: 'Kyrgyz', flag: '🇰🇬' },
  { code: 'lo', name: 'Lao', flag: '🇱🇦' },
  { code: 'la', name: 'Latin', flag: '🇻🇦' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'lg', name: 'Luganda', flag: '🇺🇬' },
  { code: 'lb', name: 'Luxembourgish', flag: '🇱🇺' },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'mai', name: 'Maithili', flag: '🇮🇳' },
  { code: 'mg', name: 'Malagasy', flag: '🇲🇬' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'mt', name: 'Maltese', flag: '🇲🇹' },
  { code: 'mi', name: 'Maori', flag: '🇳🇿' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'my', name: 'Myanmar (Burmese)', flag: '🇲🇲' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'or', name: 'Odia (Oriya)', flag: '🇮🇳' },
  { code: 'om', name: 'Oromo', flag: '🇪🇹' },
  { code: 'ps', name: 'Pashto', flag: '🇦🇫' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'qu', name: 'Quechua', flag: '🇵🇪' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'sm', name: 'Samoan', flag: '🇼🇸' },
  { code: 'sa', name: 'Sanskrit', flag: '🇮🇳' },
  { code: 'gd', name: 'Scots Gaelic', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'st', name: 'Sesotho', flag: '🇱🇸' },
  { code: 'sn', name: 'Shona', flag: '🇿🇼' },
  { code: 'sd', name: 'Sindhi', flag: '🇵🇰' },
  { code: 'si', name: 'Sinhala', flag: '🇱🇰' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'so', name: 'Somali', flag: '🇸🇴' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'su', name: 'Sundanese', flag: '🇮🇩' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'tg', name: 'Tajik', flag: '🇹🇯' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'tt', name: 'Tatar', flag: '🇷🇺' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'ti', name: 'Tigrinya', flag: '🇪🇹' },
  { code: 'ts', name: 'Tsonga', flag: '🇿🇦' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'tk', name: 'Turkmen', flag: '🇹🇲' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'ug', name: 'Uyghur', flag: '🇨🇳' },
  { code: 'uz', name: 'Uzbek', flag: '🇺🇿' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'xh', name: 'Xhosa', flag: '🇿🇦' },
  { code: 'yi', name: 'Yiddish', flag: '🇮🇱' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
];

const POPULAR_LANGUAGE_CODES: readonly string[] = [
  'en', 'es', 'de', 'fr', 'it', 'pt', 'ru', 'uk', 'pl', 'nl',
  'tr', 'zh-cn', 'zh-tw', 'ja', 'ko', 'ar', 'hi', 'id', 'vi', 'th',
  'sv', 'el', 'cs', 'ro', 'hu',
];

export const POPULAR_LANGUAGES: readonly LanguageChoice[] = POPULAR_LANGUAGE_CODES
  .map((code) => ALL_SUPPORTED_LANGUAGES.find((lang) => lang.code === code))
  .filter((lang): lang is LanguageChoice => lang !== undefined);

export function getLocalizedLanguageName(code: string, displayLocale?: string): string {
  const cleanCode = normalizeLanguageCode(code);
  const targetLocale = displayLocale ? mapDiscordLocaleToLanguage(displayLocale) : 'en';

  try {
    const dn = new Intl.DisplayNames([targetLocale, 'en'], { type: 'language' });
    let bcpCode = cleanCode;
    if (bcpCode === 'zh-cn') bcpCode = 'zh-Hans';
    else if (bcpCode === 'zh-tw') bcpCode = 'zh-Hant';

    const localized = dn.of(bcpCode) || dn.of(cleanCode);
    if (localized) {
      return localized.charAt(0).toUpperCase() + localized.slice(1);
    }
  } catch {}

  const match = ALL_SUPPORTED_LANGUAGES.find((l) => l.code === cleanCode);
  return match?.name || cleanCode.toUpperCase();
}

export function getLanguageAutonym(code: string): string {
  const cleanCode = normalizeLanguageCode(code);
  try {
    let bcpCode = cleanCode;
    if (bcpCode === 'zh-cn') bcpCode = 'zh-Hans';
    else if (bcpCode === 'zh-tw') bcpCode = 'zh-Hant';

    const dn = new Intl.DisplayNames([bcpCode], { type: 'language' });
    const name = dn.of(bcpCode) || dn.of(cleanCode);
    if (name) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch {}

  const match = ALL_SUPPORTED_LANGUAGES.find((l) => l.code === cleanCode);
  return match?.name || cleanCode.toUpperCase();
}

export interface LanguagePageResult {
  languages: readonly LanguageChoice[];
  page: number;
  totalPages: number;
}

export function getLanguagePage(page: number, displayLocale?: string): LanguagePageResult {
  const formatChoice = (lang: LanguageChoice): LanguageChoice => ({
    code: lang.code,
    name: getLocalizedLanguageName(lang.code, displayLocale),
    flag: lang.flag,
  });

  const sortedAll = [...ALL_SUPPORTED_LANGUAGES]
    .map(formatChoice)
    .sort((a, b) => a.name.localeCompare(b.name, displayLocale || 'en'));

  const pageSize = 25;
  const alphabeticalPages = Math.ceil(sortedAll.length / pageSize);
  const totalPages = 1 + alphabeticalPages;

  const clampedPage = Math.max(0, Math.min(page, totalPages - 1));

  if (clampedPage === 0) {
    return {
      languages: POPULAR_LANGUAGES.map(formatChoice),
      page: 0,
      totalPages,
    };
  }

  const alphaIndex = clampedPage - 1;
  const start = alphaIndex * pageSize;
  const end = start + pageSize;
  const sliced = sortedAll.slice(start, end);

  return {
    languages: sliced,
    page: clampedPage,
    totalPages,
  };
}

const SEARCH_LOCALES: readonly string[] = ['en', 'de', 'es', 'fr', 'it', 'ru', 'tr', 'pt', 'ja', 'zh'];

function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/ß/g, 'ss')
    .trim();
}

interface LanguageSearchEntry {
  readonly lang: LanguageChoice;
  readonly tokens: readonly string[];
}

let cachedSearchMap: readonly LanguageSearchEntry[] | null = null;

function getSearchMap(): readonly LanguageSearchEntry[] {
  if (cachedSearchMap) return cachedSearchMap;

  const entries: LanguageSearchEntry[] = ALL_SUPPORTED_LANGUAGES.map((lang) => {
    const tokenSet = new Set<string>();
    tokenSet.add(lang.code.toLowerCase());
    tokenSet.add(normalizeSearchText(lang.code));
    tokenSet.add(lang.name.toLowerCase());
    tokenSet.add(normalizeSearchText(lang.name));
    tokenSet.add(lang.flag);

    const autonym = getLanguageAutonym(lang.code);
    if (autonym) {
      tokenSet.add(autonym.toLowerCase());
      tokenSet.add(normalizeSearchText(autonym));
    }

    for (const loc of SEARCH_LOCALES) {
      try {
        const dn = new Intl.DisplayNames([loc], { type: 'language' });
        let bcp = lang.code;
        if (bcp === 'zh-cn') bcp = 'zh-Hans';
        if (bcp === 'zh-tw') bcp = 'zh-Hant';
        const localizedName = dn.of(bcp) || dn.of(lang.code);
        if (localizedName) {
          tokenSet.add(localizedName.toLowerCase());
          tokenSet.add(normalizeSearchText(localizedName));
        }
      } catch {}
    }

    return {
      lang,
      tokens: Array.from(tokenSet),
    };
  });

  cachedSearchMap = entries;
  return entries;
}

function scoreLanguageMatch(tokens: readonly string[], clean: string, cleanNorm: string): number {
  let score = 0;
  for (const token of tokens) {
    if (token === clean || token === cleanNorm) {
      return 100;
    }
    if (token.startsWith(clean) || token.startsWith(cleanNorm)) {
      score = Math.max(score, 80);
    } else if (token.includes(clean) || token.includes(cleanNorm)) {
      score = Math.max(score, 50);
    }
  }
  return score;
}

export function searchLanguages(query: string, displayLocale?: string): readonly LanguageChoice[] {
  const clean = query.toLowerCase().trim();
  const cleanNorm = normalizeSearchText(query);
  const formatChoice = (lang: LanguageChoice): LanguageChoice => ({
    code: lang.code,
    name: getLocalizedLanguageName(lang.code, displayLocale),
    flag: lang.flag,
  });

  if (!clean) {
    return POPULAR_LANGUAGES.map(formatChoice);
  }

  const searchMap = getSearchMap();
  const scoredResults: { lang: LanguageChoice; score: number }[] = [];

  for (const entry of searchMap) {
    const score = scoreLanguageMatch(entry.tokens, clean, cleanNorm);
    if (score > 0) {
      scoredResults.push({ lang: entry.lang, score });
    }
  }

  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults
    .slice(0, 25)
    .map((item) => formatChoice(item.lang));
}

export function mapDiscordLocaleToLanguage(locale?: string): string {
  if (!locale) return 'en';
  const clean = locale.toLowerCase().trim();
  if (clean.startsWith('zh-cn') || clean === 'zh-hans') return 'zh-cn';
  if (clean.startsWith('zh-tw') || clean === 'zh-hant') return 'zh-tw';
  const primary = clean.split('-')[0];
  const match = ALL_SUPPORTED_LANGUAGES.find((l) => l.code === primary || l.code === clean);
  return match ? match.code : primary;
}

export function getLanguageCodeFromFlag(emoji: string): string | null {
  const flagMap: Record<string, string> = {
    '🇩🇪': 'de', '🇦🇹': 'de', '🇨🇭': 'de',
    '🇬🇧': 'en', '🇺🇸': 'en', '🇨🇦': 'en', '🇦🇺': 'en', '🇳🇿': 'en', '🇮🇪': 'en',
    '🇪🇸': 'es', '🇲🇽': 'es', '🇦🇷': 'es', '🇨🇴': 'es', '🇨🇱': 'es', '🇵🇪': 'es',
    '🇫🇷': 'fr', '🇧🇪': 'fr', '🇲🇨': 'fr',
    '🇮🇹': 'it', '🇻🇦': 'it',
    '🇵🇹': 'pt', '🇧🇷': 'pt',
    '🇳🇱': 'nl',
    '🇸🇪': 'sv',
    '🇩🇰': 'da',
    '🇫🇮': 'fi',
    '🇳🇴': 'no',
    '🇮🇸': 'is',
    '🇷🇺': 'ru',
    '🇵🇱': 'pl',
    '🇺🇦': 'uk',
    '🇨🇿': 'cs',
    '🇭🇺': 'hu',
    '🇷🇴': 'ro',
    '🇬🇷': 'el',
    '🇧🇬': 'bg',
    '🇸🇰': 'sk',
    '🇭🇷': 'hr',
    '🇷🇸': 'sr',
    '🇸🇮': 'sl',
    '🇪🇪': 'et',
    '🇱🇻': 'lv',
    '🇱🇹': 'lt',
    '🇯🇵': 'ja',
    '🇰🇷': 'ko',
    '🇨🇳': 'zh-cn', '🇹🇼': 'zh-tw', '🇭🇰': 'zh-tw',
    '🇻🇳': 'vi',
    '🇹🇭': 'th',
    '🇮🇩': 'id',
    '🇲🇾': 'ms',
    '🇵🇭': 'tl',
    '🇮🇳': 'hi',
    '🇵🇰': 'ur',
    '🇧🇩': 'bn',
    '🇹🇷': 'tr',
    '🇮🇱': 'he',
    '🇸🇦': 'ar', '🇦🇪': 'ar', '🇪🇬': 'ar', '🇶🇦': 'ar', '🇯🇴': 'ar',
    '🇮🇷': 'fa',
    '🇿🇦': 'af',
    '🇦🇱': 'sq',
    '🇪🇹': 'am',
    '🇦🇲': 'hy',
    '🇦🇿': 'az',
    '🇧🇦': 'bs',
    '🇬🇪': 'ka',
    '🇭🇹': 'ht',
    '🇰🇿': 'kk',
    '🇰🇭': 'km',
    '🇱🇦': 'lo',
    '🇲🇰': 'mk',
    '🇲🇳': 'mn',
    '🇲🇲': 'my',
    '🇳🇵': 'ne',
    '🇸🇴': 'so',
    '🇺🇿': 'uz',
  };

  return flagMap[emoji] || null;
}

export function normalizeLanguageCode(code: string): string {
  const cleanCode = code.toLowerCase().trim();
  const aliases: Record<string, string> = {
    ph: 'tl',
    fil: 'tl',
    jp: 'ja',
    kr: 'ko',
    cn: 'zh-cn',
    tw: 'zh-tw',
    hk: 'zh-tw',
    zh: 'zh-cn',
    ua: 'uk',
    cz: 'cs',
    in: 'hi',
    vn: 'vi',
    th: 'th',
    my: 'ms',
    sa: 'ar',
    ae: 'ar',
    eg: 'ar',
    ir: 'fa',
    il: 'he',
    br: 'pt',
    mx: 'es',
    at: 'de',
    ch: 'de',
  };

  return aliases[cleanCode] || cleanCode;
}
