// modules/auth/authHandler.js - Main auth command handler

const config = require('../../config');
const { createLogger } = require('../utils/logger');
const { validateOrderSession } = require('./stripeApi');
const { fetchLicenseItems } = require('./licenseApi');
const { assignCustomerRole, assignProductRole } = require('./roleManager');
const logger = createLogger('AuthHandler');

// State tracking for user conversations
const userState = new Map();

/**
 * Handles the authentication command flow in DMs.
 * @param {Object} message - The Discord message object
 * @param {Object} client - The Discord client
 */
async function handleAuthCommand(message, client) {
  // Because we're in a DM, message.guild is null, so fetch your main guild from the client
  const guild = client.guilds.cache.get(config.MAIN_GUILD_ID);
  if (!guild) {
    logger.error(`Could not find the main guild. Check MAIN_GUILD_ID: ${config.MAIN_GUILD_ID}`);
    return;
  }

  const userId = message.author.id;
  const messageContent = message.content.trim();

  logger.debug(`Processing auth message from ${message.author.tag}: ${messageContent}`);

  // Check or initialize the user state
  let state = userState.get(userId);
  if (!state) {
    userState.set(userId, { stage: 'awaiting_input', timestamp: Date.now() });
  } else {
    // Check for timeout
    if (Date.now() - state.timestamp > config.AUTH_TIMEOUT) {
      userState.delete(userId);
      return message.reply('Authentication session timed out. Please start again by sending your order number and session ID.');
    }
  }

  // Improved extraction logic for order and session IDs
let orderNumber = null;
let sessionId = null;

// Try to extract order number and session ID from the message
const parts = messageContent.split(/\s+/).filter(part => part.length > 0);

// Analyze the message to identify order number and session ID
for (let i = 0; i < parts.length; i++) {
  const part = parts[i].toLowerCase();
  const cleanPart = parts[i].replace(/[^a-zA-Z0-9#]/g, ''); // Keep # in the cleaned part
  
  // Order numbers are typically shorter, numeric, and may be preceded by "#"
  if ((part.includes('order') || part.includes('#')) && i + 1 < parts.length) {
    // The next part is likely the order number - keep the hashtag
    orderNumber = parts[i + 1]; // Don't strip characters, keep the original format
    i++; // Skip the next part since we used it
  } 
  // Session IDs are longer and start with "cs_"
  else if (part.includes('session') && i + 1 < parts.length) {
    // The next part is likely the session ID
    sessionId = parts[i + 1];
    i++; // Skip the next part since we used it
  }
  // If the part itself starts with "#", it might be the order number
  else if (part.startsWith('#')) {
    orderNumber = part; // Keep as is to preserve the hashtag
  }
  // If the part itself starts with "cs_", it's very likely the session ID
  else if (part.startsWith('cs_')) {
    sessionId = part;
  }
  // If it's a number with fewer than 6 digits, it's likely an order number
  else if (/^\d+$/.test(cleanPart.replace('#', '')) && cleanPart.length < 6) {
    orderNumber = parts[i]; // Keep original to preserve format
  }
  // If it's a long alphanumeric string, it's likely a session ID
  else if (cleanPart.length > 20) {
    sessionId = parts[i];
  }
}

// If we still don't have both, check if there are exactly two parts
if ((!orderNumber || !sessionId) && parts.length === 2) {
  // If one part is numeric and short, it's the order number
  if (/^\d+$/.test(parts[0].replace(/[^0-9]/g, '')) && parts[0].length < 10) {
    orderNumber = parts[0]; // Keep the original format
    sessionId = parts[1];
  } else if (/^\d+$/.test(parts[1].replace(/[^0-9]/g, '')) && parts[1].length < 10) {
    orderNumber = parts[1]; // Keep the original format
    sessionId = parts[0];
  }
  // If one part starts with cs_, it's the session ID
  else if (parts[0].toLowerCase().startsWith('cs_')) {
    sessionId = parts[0];
    orderNumber = parts[1]; // Keep the original format
  } else if (parts[1].toLowerCase().startsWith('cs_')) {
    sessionId = parts[1];
    orderNumber = parts[0]; // Keep the original format
  }
}

// One final heuristic: if the orderNumber is very long and the sessionId is short,
// they're probably swapped
if (orderNumber && sessionId && 
    orderNumber.length > 20 && sessionId.length < 10 &&
    !orderNumber.startsWith('cs_') && !sessionId.startsWith('cs_')) {
  [orderNumber, sessionId] = [sessionId, orderNumber];
}

// Check if extraction was successful
if (!orderNumber || !sessionId) {
  return message.reply('Please provide your order number and session ID in the following format: `#ordernumber YourSessionId`');
}

// Stripe Session IDs typically start with cs_live or cs_test
if (!sessionId.startsWith('cs_') && sessionId.includes('cs_')) {
  // Extract just the cs_ part and everything after it
  const match = sessionId.match(/(cs_[a-zA-Z0-9_]+)/);
  if (match) {
    sessionId = match[1];
  }
}

logger.debug(`Extracted order number: ${orderNumber}, session ID: ${sessionId}`);  
  try {
    // Let the user know we're processing
    await message.reply('Verifying your information, please wait...');

    // Validate that the session ID matches the order number via Stripe API
    const validationResult = await validateOrderSession(orderNumber, sessionId);
    if (!validationResult.valid) {
      userState.delete(userId);
      return message.reply('? Validation failed: The order number and session ID do not match or the order was not found.');
    }

    // Fetch the license key(s) + product info from the Easy-product-downloads API
    const licenseResult = await fetchLicenseItems(orderNumber);
    if (licenseResult.success && licenseResult.items && licenseResult.items.length > 0) {
      // Create DM channel (if not already open)
      const dmChannel = await message.author.createDM();
      await dmChannel.send(`? **Verification successful!**\n\nHere are your license keys for order ${orderNumber}:`);

      // Assign the customer role first
      await assignCustomerRole(guild, message.author.id);

      // Keep track of assigned channels for the final message
      const assignedChannels = [];

      for (const item of licenseResult.items) {
        // Send the license key
        await dmChannel.send(`\`\`\`\n${item.licenseKey}\n\`\`\``);

        // Get the product name for debugging
        const productName = item.productName || item.product || "unknown";
        logger.debug(`Processing license for product: "${productName}"`);

        // Attempt to find and assign the relevant role with full product info
        const roleResult = await assignProductRole(guild, message.author.id, productName, item);
        
        // If a channel was found and role assigned, store the channel info
        if (roleResult && roleResult.success && roleResult.channelId) {
          assignedChannels.push({
            id: roleResult.channelId,
            name: roleResult.channelName,
            product: roleResult.productName || productName
          });
        }
      }

      // Construct a message with channel links
      let finalMessage = '? Verification successful! Your license key(s) and role assignment have been handled.';
      
      if (assignedChannels.length > 0) {
        finalMessage += '\n\n**Please visit the following channel(s) to download your product(s):**';
        
        for (const channel of assignedChannels) {
          finalMessage += `\n- <#${channel.id}> for ${channel.product}`;
        }
      }

      // Send the final message only in DM
      await dmChannel.send(finalMessage);
      
      // Only send a confirmation in the original channel if it wasn't already a DM
      if (message.guild) {
        await message.reply('? Verification successful! Your license key(s) and role assignment have been handled via direct message.');
      }
	  
      logger.info(`Authentication completed successfully for user ${message.author.tag} (${userId})`);
    } else {
      logger.warn(`No license keys found for order ${orderNumber}`);
      await message.reply('?? Your order is valid, but we couldn\'t retrieve your license keys. Please contact support for assistance.');
    }

    // Clear the user state
    userState.delete(userId);

  } catch (error) {
    logger.error(`Authentication error for user ${userId}:`, error.message);
    message.reply('? An error occurred during verification. Please try again later or contact support.');
    userState.delete(userId);
  }
}
module.exports = {
  handleAuthCommand,
  userState
};