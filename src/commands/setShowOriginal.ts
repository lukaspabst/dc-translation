import { SlashCommandBuilder, ChatInputCommandInteraction, CacheType, MessageFlags } from 'discord.js';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';

export const data = new SlashCommandBuilder()
  .setName('setoriginal')
  .setDescription('Sets whether to show the original text in translations')
  .setDescriptionLocalizations({
    de: 'Legt fest, ob der Originaltext bei Übersetzungen angezeigt wird',
    'es-ES': 'Configura si se muestra el texto original en las traducciones',
    fr: 'Définit si le texte original est affiché dans les traductions',
    it: 'Imposta se mostrare il testo originale nelle traduzioni',
  })
  .addBooleanOption(option =>
    option
      .setName('show')
      .setDescription('True to show the original message, False to hide it')
      .setDescriptionLocalizations({
        de: 'True: Originaltext anzeigen, False: Ausblenden',
        'es-ES': 'True para mostrar el mensaje original, False para ocultarlo',
        fr: 'True pour afficher le message original, False pour le masquer',
        it: 'True per mostrare il messaggio originale, False per nasconderlo',
      })
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const showOriginal = interaction.options.getBoolean('show');
  
  if (showOriginal === null) {
    await interaction.reply({ content: 'Option is required.', flags: MessageFlags.Ephemeral });
    return;
  }

  const targetLanguage = dbService.getUserPreferences(interaction.user.id).target_language;

  try {
    dbService.setShowOriginal(interaction.user.id, showOriginal);
    const successMsg = await translationService.translateUI(`Original message display has been set to \`${showOriginal ? 'True' : 'False'}\`.`, targetLanguage);
    await interaction.reply({ 
      content: successMsg, 
      flags: MessageFlags.Ephemeral 
    });
  } catch (error) {
    console.error('Error saving preference:', error);
    const errMsg = await translationService.translateUI('Failed to save your preference. Please try again later.', targetLanguage);
    await interaction.reply({ 
      content: errMsg, 
      flags: MessageFlags.Ephemeral 
    });
  }
}
