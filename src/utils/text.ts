export function stripDiscordMarkupAndEmojis(content: string): string {
  return content
    .replace(/!\[.*?\]\([^\s)]+\)/g, '')
    .replace(/<*https?:\/\/[^\s>]+>*/gi, '')
    .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '')
    .replace(/<@!?[0-9]+>|<#\d+>|<@&\d+>/g, '')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\u20E3]/gu, '')
    .trim();
}

export function isPureMediaOrUrl(content: string): boolean {
  if (!content) return true;
  return stripDiscordMarkupAndEmojis(content).length === 0;
}

export function hasLinguisticContent(content: string): boolean {
  if (!content) return false;
  const cleaned = stripDiscordMarkupAndEmojis(content);
  return /\p{L}/u.test(cleaned);
}

export function isAsciiEmoticon(content: string): boolean {
  const trimmed = stripDiscordMarkupAndEmojis(content);
  if (!trimmed) return false;
  if (/^([:;=8]-?[)D(\]\[PpOo/\\|3<>*]+|x+d+)$/i.test(trimmed)) return true;
  if (/^[oOtTqQuU][._-][oOtTqQuU]$/i.test(trimmed)) return true;
  if (/^[\\/]+[oO0_]+[\\/]+$/i.test(trimmed)) return true;

  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  const symbols = trimmed.replace(/[\p{L}\s]/gu, '');
  if (letters.length <= 2 && symbols.length >= 3) return true;
  if (letters.length === 2 && new Set(letters).size === 1 && /^[^\p{L}]*\p{L}[._-]\p{L}[^\p{L}]*$/u.test(trimmed)) return true;

  return false;
}

export function isRepetitiveNoise(content: string): boolean {
  if (!content) return false;
  const letters = content.toLowerCase().replace(/[^\p{L}]/gu, '');
  if (letters.length < 5) {
    return letters.length >= 4 && new Set(letters).size === 1;
  }
  return new Set(letters).size <= 2;
}

export function isBotCommand(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (trimmed.length === 0) return false;

  if (/^(owo|uwu)\b/i.test(trimmed)) return true;
  if (/^w\s+(hunt|battle|daily|pray|curse|cf|slots|flip|coinflip|sell|equip|inv|zoo|my|top|level|rank|points|cash|cookie|hug|kiss|bully|slap|pat|cuddle|poke)\b/i.test(trimmed)) return true;
  if (/^pls\s+/i.test(trimmed)) return true;
  if (/^[!/$~]\S*/.test(trimmed)) return true;
  if (/^\?[a-zA-Z]/.test(trimmed)) return true;
  if (/^\.[a-zA-Z]/.test(trimmed)) return true;
  if (/^,[a-zA-Z]/.test(trimmed)) return true;
  if (/^;+\S+/.test(trimmed)) return true;
  if (/^-[a-zA-Z]/.test(trimmed)) return true;
  if (/^\+[a-zA-Z]/.test(trimmed)) return true;
  if (/^[a-zA-Z]!\S*/.test(trimmed)) return true;

  return false;
}

export function isUntranslatable(content: string): boolean {
  if (!content || !content.trim()) return true;
  if (isBotCommand(content)) return true;
  if (isPureMediaOrUrl(content)) return true;
  if (!hasLinguisticContent(content)) return true;
  if (isAsciiEmoticon(content)) return true;
  if (isRepetitiveNoise(content)) return true;
  return false;
}
