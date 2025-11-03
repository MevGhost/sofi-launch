const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const { getProductIdForTitle, getProductIdForChannel } = require('./voodoo');

// Import from our new modular structure
const { handleAuthCommand } = require('./modules/auth');
const { createLogger } = require('./modules/utils/logger');
const config = require('./config');

// Initialize logger
const logger = createLogger('Bot');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages // Add direct messages intent
  ],
  partials: [Partials.Channel]
});

// Load API configuration
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const PRODUCT_API_ENDPOINT = process.env.PRODUCT_API_ENDPOINT;
if (!PRODUCT_API_ENDPOINT) {
  logger.error('PRODUCT_API_ENDPOINT is not defined in the environment variables.');
  process.exit(1);
}
const API_SECRET = process.env.API_SECRET;
if (!API_SECRET) {
  logger.error('API_SECRET is not defined in the environment variables.');
  process.exit(1);
}
const DEFAULT_PRODUCT_ID = process.env.DEFAULT_PRODUCT_ID || 'unknown';

// Cache to store last known tag for each channel (by channel id)
// If a channel is marked "ignored", it means no mapping was found and we stop scanning it.
const channelStatusCache = {};

/**
 * Determine tag by scanning the full channel name for specific emoji or keywords.
 */
function determineTagFromChannel(channelName) {
  const workingEmojiRegex = /\u{1F7E2}/gu;   // Green circle
  const downEmojiRegex = /\u{1F534}/gu;       // Red circle
  const updatingEmojiRegex = /\u{1F7E1}/gu;   // Yellow circle

  if (workingEmojiRegex.test(channelName)) return 'working';
  if (downEmojiRegex.test(channelName)) return 'down';
  if (updatingEmojiRegex.test(channelName)) return 'updating';

  const lowerName = channelName.toLowerCase();
  if (lowerName.includes('work')) return 'working';
  if (lowerName.includes('test')) return 'down';
  if (lowerName.includes('update')) return 'updating';

  return 'unknown';
}

/**
 * Helper function to remove emojis from a string.
 */
function removeEmojis(str) {
  return str.replace(/[\u{1F300}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1FB00}-\u{1FBFF}]/gu, '').trim();
}

/**
 * Update product status by calling the API.
 */
async function updateProductStatus(newTag, productTitle, productId) {
  if (productId === DEFAULT_PRODUCT_ID || productId === 'unknown') {
    logger.warn('Skipping update because productId is invalid.');
    return;
  }
  try {
    const response = await axios.post(PRODUCT_API_ENDPOINT, {
      tag: newTag,
      title: productTitle,
      productId: productId
    }, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` }
    });
    logger.info('Product updated:', response.data);
  } catch (error) {
    logger.error('Error updating product:', error.response ? error.response.data : error.message);
  }
}

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Handle DMs
  if (!message.guild) {
    logger.info(`DM from ${message.author.tag}: ${message.content}`);
    await handleAuthCommand(message, client);
    return;
  }

  // Handle server messages: only respond to "!auth"
  if (message.content.toLowerCase() === '!auth') {
    logger.info(`Detected !auth command in server from ${message.author.tag}`);
    await message.reply('Please send me a direct message with your order number and session ID to begin the authentication process.');
    return;
  }
});

/**
 * Periodic channel scan for status updates based solely on channel names.
 */
client.on('ready', () => {
  logger.info(`Logged in as ${client.user.tag}!`);

  // Change the interval from 60000 (1 minute) to 3600000 (1 hour)
  setInterval(async () => {
    logger.info('Starting periodic channel scan for status updates.');

    // Process each guild asynchronously
    const guildPromises = client.guilds.cache.map(async guild => {
      const channels = guild.channels.cache.filter(channel => channel.isTextBased());
      await Promise.all(channels.map(async channel => {
        const channelName = channel.name;

        // If the channel is already marked as "ignored", skip it.
        if (channelStatusCache[channel.id] === 'ignored') {
          logger.info(`[Scan] Channel "${channelName}" previously ignored. Skipping.`);
          return;
        }

        const newTag = determineTagFromChannel(channelName);
        logger.info(`[Scan] Channel "${channelName}" status determined as "${newTag}"`);

        // Check cache to see if the tag changed.
        const lastTag = channelStatusCache[channel.id];
        if (lastTag && lastTag === newTag) {
          logger.info(`[Scan] No status change for channel "${channelName}". Skipping update.`);
          return;
        }

        // First, try to look up product id by channel mapping.
        let productId;
        try {
          productId = await getProductIdForChannel(channel.id);
          if (!productId) {
            const cleanedTitle = removeEmojis(channelName);
            productId = await getProductIdForTitle(cleanedTitle.toLowerCase());
            if (productId) {
              logger.info(`[Scan] Found product mapping for cleaned title "${cleanedTitle}" as: "${productId}"`);
            } else {
              logger.warn(`[Scan] No product mapping found for channel "${channelName}" (ID: ${channel.id}). Marking channel as ignored.`);
              channelStatusCache[channel.id] = 'ignored'; // Mark this channel so it won't be scanned again.
              return;
            }
          }
        } catch (err) {
          logger.error(`[Scan] DB lookup failed for channel "${channelName}":`, err.message);
          return;
        }

        const productTitle = channelName;
        // Update status only if newTag isn't "unknown"
        if (newTag !== 'unknown') {
          await updateProductStatus(newTag, productTitle, productId);
          // Update cache with the new status.
          channelStatusCache[channel.id] = newTag;
        }
      }));
    });

    // Wait until all guilds have been processed
    await Promise.all(guildPromises);
    logger.info('Cycle complete. Waiting 30 minutes for the next cycle...');
  }, config.CHANNEL_SCAN_INTERVAL); 
});

client.on('error', error => logger.error('Discord client error:', error));
process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});

client.login(DISCORD_BOT_TOKEN).catch(error => {
  logger.error('Failed to login:', error);
  process.exit(1);
});

module.exports = client;