import LanguageDetect from 'languagedetect';
import { stripDiscordMarkupAndEmojis } from '../utils/text';

const detector = new LanguageDetect();

const LANGUAGE_NAME_TO_CODE: Readonly<Record<string, string>> = {
  albanian: 'sq',
  arabic: 'ar',
  azeri: 'az',
  bengali: 'bn',
  bulgarian: 'bg',
  cebuano: 'ceb',
  croatian: 'hr',
  czech: 'cs',
  danish: 'da',
  dutch: 'nl',
  english: 'en',
  estonian: 'et',
  farsi: 'fa',
  finnish: 'fi',
  french: 'fr',
  german: 'de',
  greek: 'el',
  hausa: 'ha',
  hawaiian: 'haw',
  hebrew: 'he',
  hindi: 'hi',
  hungarian: 'hu',
  icelandic: 'is',
  indonesian: 'id',
  italian: 'it',
  kazakh: 'kk',
  kyrgyz: 'ky',
  latin: 'la',
  latvian: 'lv',
  lithuanian: 'lt',
  macedonian: 'mk',
  mongolian: 'mn',
  nepali: 'ne',
  norwegian: 'no',
  pashto: 'ps',
  pidgin: 'en',
  polish: 'pl',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'sr',
  slovak: 'sk',
  slovene: 'sl',
  somali: 'so',
  spanish: 'es',
  swahili: 'sw',
  swedish: 'sv',
  tagalog: 'tl',
  turkish: 'tr',
  ukrainian: 'uk',
  urdu: 'ur',
  uzbek: 'uz',
  vietnamese: 'vi',
  welsh: 'cy',
};

export function detectLocalLanguage(text: string): string | null {
  const cleaned = stripDiscordMarkupAndEmojis(text);
  if (cleaned.length < 20) return null;

  const words = cleaned.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 4) return null;

  if (/[\u3040-\u309F\u30A0-\u30FF]/u.test(cleaned)) {
    return 'ja';
  }
  if (/[\uAC00-\uD7AF]/u.test(cleaned)) {
    return 'ko';
  }

  const detections = detector.detect(cleaned, 2);
  if (!detections || detections.length === 0) return null;

  const [topLang, topScore] = detections[0];
  if (topScore < 0.2) return null;

  return LANGUAGE_NAME_TO_CODE[topLang.toLowerCase()] ?? null;
}

export function isSameLanguage(text: string, targetLanguage: string): boolean {
  if (!text || !targetLanguage) return false;
  const detected = detectLocalLanguage(text);
  if (!detected) return false;

  const normTarget = targetLanguage.toLowerCase().split('-')[0].trim();
  return detected === normTarget;
}
