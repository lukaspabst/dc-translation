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

