import { EmbedBuilder, User } from 'discord.js';
import { ALL_SUPPORTED_LANGUAGES, getLocalizedLanguageName } from './flags';

export const BOT_VIOLET = 0x8b5cf6;

export interface TranslationCardOptions {
  author?: User | null;
  translatedText: string;
  targetLanguage: string;
  originalText?: string;
  showOriginal?: boolean;
  engine?: 'google' | 'deepl';
  sourceChannelName?: string;
  locale?: string;
}

export function createModernTranslationEmbed(options: TranslationCardOptions): EmbedBuilder {
  const {
    author,
    translatedText,
    targetLanguage,
    originalText,
    showOriginal = true,
    engine = 'google',
    locale,
  } = options;

  const langName = getLocalizedLanguageName(targetLanguage, locale);
  const engineBadge = engine === 'deepl' ? 'DeepL' : 'Google Cloud';

  const authorName = author ? author.displayName || author.username : 'User';
  const authorAvatar = author ? author.displayAvatarURL({ size: 64 }) : undefined;

  const embed = new EmbedBuilder()
    .setColor(BOT_VIOLET)
    .setAuthor({
      name: authorName,
      iconURL: authorAvatar,
    })
    .setTitle(`Translation › ${langName}`);

  let description = `${translatedText}`;

  if (showOriginal && originalText && originalText.trim() !== '') {
    const truncatedOriginal =
      originalText.length > 350 ? `${originalText.substring(0, 350)}...` : originalText;
    description += `\n\n>>> *Original:*\n${truncatedOriginal}`;
  }

  embed.setDescription(description);
  embed.setFooter({
    text: `${engineBadge} • Translated`,
  });
  embed.setTimestamp();

  return embed;
}

export function createLiveThreadMessageEmbed(
  author: User | null | undefined,
  translatedText: string,
  targetLanguage: string,
  channelName: string,
  originalText?: string,
  showOriginal = false
): EmbedBuilder {
  const authorName = author ? author.displayName || author.username : 'User';
  const authorAvatar = author ? author.displayAvatarURL({ size: 64 }) : undefined;

  const embed = new EmbedBuilder()
    .setColor(BOT_VIOLET)
    .setAuthor({
      name: `${authorName} • #${channelName}`,
      iconURL: authorAvatar,
    })
    .setDescription(translatedText);

  if (showOriginal && originalText && originalText.trim() !== '') {
    const truncatedOriginal =
      originalText.length > 250 ? `${originalText.substring(0, 250)}...` : originalText;
    embed.addFields({
      name: 'Original',
      value: `>>> *${truncatedOriginal}*`,
    });
  }

  embed.setFooter({
    text: 'Live Feed',
  });
  embed.setTimestamp();

  return embed;
}

export interface BatchedMessageItem {
  authorName: string;
  authorAvatar?: string;
  translatedText: string;
  originalText?: string;
}

function getChannelColor(channelName: string): number {
  let hash = 0;
  for (let i = 0; i < channelName.length; i++) {
    hash = (hash << 5) - hash + channelName.charCodeAt(i);
    hash |= 0;
  }
  const colors = [
    0x8b5cf6,
    0x3b82f6,
    0x10b981,
    0xf59e0b,
    0xec4899,
    0x06b6d4,
    0x6366f1,
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function createBatchedChannelEmbed(options: {
  channelName: string;
  targetLanguage: string;
  items: readonly BatchedMessageItem[];
  showOriginal?: boolean;
}): EmbedBuilder {
  const { channelName, items, showOriginal = false } = options;

  const embed = new EmbedBuilder()
    .setColor(getChannelColor(channelName))
    .setTitle(`#${channelName} › Transcript`);

  if (items.length === 1 && items[0].authorAvatar) {
    embed.setAuthor({
      name: `${items[0].authorName} • #${channelName}`,
      iconURL: items[0].authorAvatar,
    });
  }

  const lines: string[] = [];
  for (const item of items) {
    const text =
      item.translatedText.length > 500
        ? `${item.translatedText.substring(0, 500)}...`
        : item.translatedText;
    let block = `**${item.authorName}**: ${text}`;
    if (
      showOriginal &&
      item.originalText &&
      item.originalText.trim() !== '' &&
      item.translatedText.trim().toLowerCase() !== item.originalText.trim().toLowerCase()
    ) {
      const orig =
        item.originalText.length > 200
          ? `${item.originalText.substring(0, 200)}...`
          : item.originalText;
      block += `\n> *${orig}*`;
    }
    lines.push(block);
  }

  let description = lines.join('\n\n');
  if (description.length > 4000) {
    description = `${description.substring(0, 3995)}...`;
  }

  embed.setDescription(description);
  embed.setFooter({
    text: `Live Feed • ${items.length} ${items.length === 1 ? 'message' : 'messages'}`,
  });
  embed.setTimestamp();

  return embed;
}

