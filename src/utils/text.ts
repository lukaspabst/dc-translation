export function isPureMediaOrUrl(content: string): boolean {
  if (!content) return true;
  const stripped = content
    .replace(/<*https?:\/\/[^\s>]+>*/gi, '')
    .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '')
    .replace(/<@!?[0-9]+>|<#\d+>|<@&\d+>/g, '')
    .trim();
  return stripped.length === 0;
}
