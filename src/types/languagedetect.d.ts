declare module 'languagedetect' {
  class LanguageDetect {
    detect(text: string, limit?: number): Array<[string, number]>;
    getLanguages(): string[];
  }
  export = LanguageDetect;
}
