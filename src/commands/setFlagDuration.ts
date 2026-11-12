import { SlashCommandBuilder, ChatInputCommandInteraction, CacheType, MessageFlags } from 'discord.js';
import { dbService } from '../db/database';
import { translationService } from '../services/translator';

export const data = new SlashCommandBuilder()
  .setName('setduration')
  .setDescription('Sets how long flag translations stay visible (in minutes)')
  .setDescriptionLocalizations({
    de: 'Legt fest, wie viele Minuten Flaggen-Übersetzungen sichtbar bleiben',
    'es-ES': 'Configura cuánto tiempo permanecen visibles las traducciones por bandera',
    fr: 'Définit combien de minutes les traductions par drapeau restent visibles',
    it: 'Imposta quanti minuti le traduzioni per bandiera rimangono visibili',
  })
  .addIntegerOption(option =>
    option
      .setName('minutes')
      .setDescription('Duration in minutes (use 0 for permanent, max 10080)')
      .setDescriptionLocalizations({
        de: 'Dauer in Minuten (0 für dauerhaft, max 10080)',
        'es-ES': 'Duración en minutos (0 para permanente, máx 10080)',
        fr: 'Durée en minutes (0 pour permanent, max 10080)',
        it: 'Durata in minuti (0 per permanente, max 10080)',
      })
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(10080)
  );

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
  const minutes = interaction.options.getInteger('minutes');
  
  if (minutes === null || minutes < 0) {
    await interaction.reply({ content: 'A valid number of minutes (0 or greater) is required.', flags: MessageFlags.Ephemeral });
    return;
  }

  const targetLanguage = dbService.getUserPreferences(interaction.user.id).target_language;

  try {
    dbService.setFlagDuration(interaction.user.id, minutes);
    
    let msg = `Flag translations will be permanent.`;
    if (minutes > 0) {
      msg = `Flag translations will auto-delete after \`${minutes}\` minutes.`;
    }

    const successMsg = await translationService.translateUI(msg, targetLanguage);
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
