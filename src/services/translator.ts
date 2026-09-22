import translate from 'google-translate-api-x';
import * as deepl from 'deepl-node';
import { translationCache } from './cache';
import { getUILabels, UILabels } from '../utils/locales';
import { isUntranslatable } from '../utils/text';
import { isSameLanguage } from './languageDetector';

let deeplTranslator: deepl.Translator | null = null;
let googleApiKey: string | undefined;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

export function initDeepL(authKey: string | undefined): void {
  if (authKey && authKey.trim() !== '') {
    deeplTranslator = new deepl.Translator(authKey);
  }
}

export function initGoogleApi(apiKey: string | undefined): void {
  if (apiKey && apiKey.trim() !== '') {
    googleApiKey = apiKey.trim();
  }
}

export const translationService = {
  async translateWithGoogle(text: string, targetLanguage: string): Promise<string> {
    if (isUntranslatable(text)) {
      console.log(
        JSON.stringify({
          event: 'translation_skip_untranslatable',
          engine: 'google',
          char_count: text.length,
          target: targetLanguage,
        })
      );
      return text;
    }
    if (isSameLanguage(text, targetLanguage)) {
      console.log(
        JSON.stringify({
          event: 'translation_skip_same_language',
          engine: 'google',
          char_count: text.length,
          target: targetLanguage,
        })
      );
      return text;
    }
    return translationCache.getOrTranslate(text, targetLanguage, 'google', async () => {
      console.log(
        JSON.stringify({
          event: 'translation_call',
          engine: 'google',
          char_count: text.length,
          target: targetLanguage,
        })
      );
      if (googleApiKey) {
        try {
          const response = await fetch(
            `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                q: text,
                target: targetLanguage,
                format: 'text',
              }),
            }
          );

          if (response.ok) {
            const payload = (await response.json()) as {
              data?: { translations?: Array<{ translatedText: string }> };
            };
            const translated = payload.data?.translations?.[0]?.translatedText;
            if (translated) {
              return decodeHtmlEntities(translated);
            }
          }
        } catch (err) {
          console.error('GCP Translation API request failed, falling back to web client:', err);
        }
      }

      try {
        const res = await translate(text, { to: targetLanguage });
        return decodeHtmlEntities(res.text);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'translation_error',
            engine: 'google',
            error: error instanceof Error ? error.message : String(error),
            severity: 'ERROR',
          })
        );
        throw new Error('Failed to translate with Google Translate.');
      }
    });
  },

  async translateWithDeepL(text: string, targetLanguage: string): Promise<string> {
    if (isUntranslatable(text)) {
      console.log(
        JSON.stringify({
          event: 'translation_skip_untranslatable',
          engine: 'deepl',
          char_count: text.length,
          target: targetLanguage,
        })
      );
      return text;
    }
    if (isSameLanguage(text, targetLanguage)) {
      console.log(
        JSON.stringify({
          event: 'translation_skip_same_language',
          engine: 'deepl',
          char_count: text.length,
          target: targetLanguage,
        })
      );
      return text;
    }
    return translationCache.getOrTranslate(text, targetLanguage, 'deepl', async () => {
      console.log(
        JSON.stringify({
          event: 'translation_call',
          engine: 'deepl',
          char_count: text.length,
          target: targetLanguage,
        })
      );
      if (!deeplTranslator) {
        throw new Error('DeepL translator is not configured.');
      }

      try {
        let deeplTargetLang: string = targetLanguage.toLowerCase().trim();

        if (deeplTargetLang === 'en') deeplTargetLang = 'en-US';
        if (deeplTargetLang === 'pt') deeplTargetLang = 'pt-PT';
        if (deeplTargetLang.startsWith('zh')) deeplTargetLang = 'zh';
        if (deeplTargetLang === 'uk') deeplTargetLang = 'uk';

        const result = await deeplTranslator.translateText(
          text,
          null,
          deeplTargetLang as deepl.TargetLanguageCode
        );

        const translated = Array.isArray(result) ? result[0].text : result.text;
        return decodeHtmlEntities(translated);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          JSON.stringify({
            event: 'translation_error',
            engine: 'deepl',
            error: errorMsg,
            severity: 'ERROR',
          })
        );
        if (errorMsg.includes('Quota') || errorMsg.includes('quota') || errorMsg.includes('456')) {
          throw new Error('DeepL monthly quota exceeded. Please use Google Translate.');
        }
        throw new Error(`Failed to translate with DeepL: ${errorMsg}`);
      }
    });
  },

  getUI(targetLanguage: string): UILabels {
    return getUILabels(targetLanguage);
  },

  async detectLanguage(text: string): Promise<string> {
    if (googleApiKey) {
      try {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2/detect?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: text }),
          }
        );
        if (response.ok) {
          const payload = (await response.json()) as {
            data?: { detections?: Array<Array<{ language: string; confidence: number }>> };
          };
          const detected = payload.data?.detections?.[0]?.[0]?.language;
          if (detected) return detected.toLowerCase();
        }
      } catch (err) {
        console.error('Language detection failed:', err);
      }
    }
    return 'en';
  },

  async translateBatch(texts: readonly string[], targetLanguage: string): Promise<string[]> {
    if (texts.length === 0) return [];
    if (googleApiKey) {
      try {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: texts,
              target: targetLanguage,
              format: 'text',
            }),
          }
        );

        if (response.ok) {
          const payload = (await response.json()) as {
            data?: { translations?: Array<{ translatedText: string }> };
          };
          const translations = payload.data?.translations;
          if (translations && translations.length === texts.length) {
            return translations.map((t) => decodeHtmlEntities(t.translatedText));
          }
        }
      } catch (err) {
        console.error('GCP batch translation error, falling back to individual calls:', err);
      }
    }

    const results: string[] = [];
    for (const txt of texts) {
      try {
        const res = await this.translateWithGoogle(txt, targetLanguage);
        results.push(res);
      } catch {
        results.push(txt);
      }
    }
    return results;
  },

  async translateDictionary(
    dict: Record<string, string>,
    targetLanguage: string
  ): Promise<Record<string, string>> {
    const keys = Object.keys(dict);
    const values = keys.map((k) => dict[k]);
    const translatedValues = await this.translateBatch(values, targetLanguage);

    const result: Record<string, string> = {};
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = translatedValues[i] || values[i];
    }
    return result;
  },

  async translateUI(text: string, targetLanguage: string): Promise<string> {
    const labels = getUILabels(targetLanguage);
    switch (text) {
      case 'Translation':
        return labels.title;
      case 'Original':
        return labels.original;
      case 'Translated':
        return labels.translated;
      case 'Translate with DeepL (Better Quality)':
        return labels.deeplBtn;
      case 'requested a translation:':
        return labels.requestedBy;
      default:
        return text;
    }
  },
};
