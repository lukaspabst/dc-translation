export function isPureMediaOrUrl(content: string): boolean {
  if (!content) return true;
  const stripped = content
    .replace(/!\[.*?\]\([^\s)]+\)/g, '')
    .replace(/<*https?:\/\/[^\s>]+>*/gi, '')
    .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '')
    .replace(/<@!?[0-9]+>|<#\d+>|<@&\d+>/g, '')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\u20E3]/gu, '')
    .trim();
  return stripped.length === 0;
}
