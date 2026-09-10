import { createHash } from 'crypto';
import type { Collection } from 'mongodb';
import { encryptField, decryptField } from '../utils/crypto';

export interface CachedTranslationDoc {
  key: string;
  source_text?: string;
  target_lang: string;
  translated_text: string;
  engine: string;
  created_at: Date;
}

let mongoCacheCol: Collection<CachedTranslationDoc> | null = null;

export function setMongoCacheCollection(col: Collection<CachedTranslationDoc> | null): void {
  mongoCacheCol = col;
}

class EnhancedTranslationCache {
  private readonly maxSize: number;
  private readonly l1Cache: Map<string, string>;
  private readonly inFlight: Map<string, Promise<string>>;

  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
    this.l1Cache = new Map();
    this.inFlight = new Map();
  }

  public generateKey(text: string, targetLanguage: string, engine = 'google'): string {
    const normalized = `${text.trim()}|${targetLanguage.toLowerCase().trim()}|${engine.toLowerCase().trim()}`;
    return createHash('sha256').update(normalized).digest('hex');
  }

  public getL1(key: string): string | null {
    const hit = this.l1Cache.get(key);
    if (hit !== undefined) {
      this.l1Cache.delete(key);
      this.l1Cache.set(key, hit);
      return hit;
    }
    return null;
  }

  public setL1(key: string, translatedText: string): void {
    if (this.l1Cache.has(key)) {
      this.l1Cache.delete(key);
    } else if (this.l1Cache.size >= this.maxSize) {
      const oldest = this.l1Cache.keys().next().value;
      if (oldest) {
        this.l1Cache.delete(oldest);
      }
    }
    this.l1Cache.set(key, translatedText);
  }

  public async get(text: string, targetLanguage: string, engine = 'google'): Promise<string | null> {
    const key = this.generateKey(text, targetLanguage, engine);
    const l1Hit = this.getL1(key);
    if (l1Hit) {
      return l1Hit;
    }

    if (mongoCacheCol) {
      try {
        const doc = await mongoCacheCol.findOne({ key });
        if (doc && doc.translated_text) {
          const decrypted = decryptField(doc.translated_text);
          this.setL1(key, decrypted);
          return decrypted;
        }
      } catch (err) {
        console.warn('MongoDB Atlas cache lookup warning:', err);
      }
    }

    return null;
  }

  public async set(
    text: string,
    targetLanguage: string,
    engine: string,
    translatedText: string
  ): Promise<void> {
    const key = this.generateKey(text, targetLanguage, engine);
    this.setL1(key, translatedText);

    if (mongoCacheCol) {
      try {
        const encTranslated = encryptField(translatedText);
        await mongoCacheCol.updateOne(
          { key },
          {
            $set: {
              key,
              target_lang: targetLanguage.toLowerCase().trim(),
              translated_text: encTranslated,
              engine,
              created_at: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.warn('MongoDB Atlas cache save warning:', err);
      }
    }
  }

  public async getOrTranslate(
    text: string,
    targetLanguage: string,
    engine: string,
    translateFn: () => Promise<string>
  ): Promise<string> {
    const key = this.generateKey(text, targetLanguage, engine);

    const cached = await this.get(text, targetLanguage, engine);
    if (cached) {
      console.log(
        JSON.stringify({
          event: 'translation_cache_hit',
          engine,
          chars_saved: text.length,
          target: targetLanguage,
        })
      );
      return cached;
    }

    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const translationPromise = (async () => {
      try {
        const result = await translateFn();
        await this.set(text, targetLanguage, engine, result);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, translationPromise);
    return translationPromise;
  }

  public clear(): void {
    this.l1Cache.clear();
    this.inFlight.clear();
  }
}

export const translationCache = new EnhancedTranslationCache();
