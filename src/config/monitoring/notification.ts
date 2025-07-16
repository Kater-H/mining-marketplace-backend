// src/config/monitoring/notification.ts
// import { Client, GatewayIntentBits } from 'discord.js'; // Commented out to resolve TS2307 error
// import { config } from '../config/config.js';

// // Initialize Discord client (if Discord notifications are enabled)
// const discordClient = config.discordBotToken ? new Client({ intents: [GatewayIntentBits.Guilds] }) : null;

// if (discordClient) {
//   discordClient.on('ready', () => {
//     console.log(`Logged in as ${discordClient.user?.tag}!`);
//   });

//   discordClient.login(config.discordBotToken);
// }

// export const sendDiscordNotification = async (message: string) => {
//   if (!discordClient || !config.discordChannelId) {
//     console.warn('Discord client not initialized or channel ID not set. Skipping Discord notification.');
//     return;
//   }

//   try {
//     const channel = await discordClient.channels.fetch(config.discordChannelId);
//     if (channel?.isTextBased()) {
//       await channel.send(message);
//       console.log('Discord notification sent successfully.');
//     } else {
//       console.warn('Discord channel is not a text channel or not found.');
//     }
//   } catch (error) {
//     console.error('Failed to send Discord notification:', error);
//   }
// };
