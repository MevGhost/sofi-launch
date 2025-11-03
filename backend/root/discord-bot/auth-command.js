// auth-command.js - Command handler for license key authentication
require('dotenv').config();
const axios = require('axios');
const { OverwriteType } = require('discord.js'); // For role-based permission overwrites

// Easy-product-downloads API token
const EPD_API_TOKEN = process.env.EPD_API_TOKEN || 'YOUR_API_TOKEN';
const STRIPE_API_URL = process.env.STRIPE_API_URL || 'http://localhost:3000'; // Your Stripe server URL
const EASY_DOWNLOADS_API_URL = process.env.EASY_DOWNLOADS_API_URL || 'https://their-site.com/api/get-license-keys-by-order';

// The main guild ID where roles/channels exist
const MAIN_GUILD_ID = process.env.MAIN_GUILD_ID || 'YOUR_GUILD_ID';
// Customer role ID
const CUSTOMER_ROLE_ID = '1116159974918332466';

// State tracking for user conversations
const userState = new Map();

/**
 * Assigns the customer role to a user if they don't already have it.
 * @param {Guild} guild - The Discord guild object.
 * @param {string} userId - The ID of the user to assign the role to.
 * @returns {Promise<boolean>} - Whether the role was assigned or already present.
 */
async function assignCustomerRole(guild, userId) {
  try {
    console.log(`[DEBUG] Starting customer role assignment for user ${userId}`);
    
    // First check if the role exists in the guild
    const customerRole = guild.roles.cache.get(CUSTOMER_ROLE_ID);
    if (!customerRole) {
      console.error(`[ERROR] Customer role with ID ${CUSTOMER_ROLE_ID} not found in guild.`);
      // Try to list some roles from the guild for debugging
      const someRoles = Array.from(guild.roles.cache.values()).slice(0, 5);
      console.log(`[DEBUG] Sample roles in guild: ${someRoles.map(r => `${r.name} (${r.id})`).join(', ')}`);
      return false;
    }
    
    console.log(`[DEBUG] Found customer role: ${customerRole.name} (${customerRole.id})`);
    
    // Fetch the guild member
    console.log(`[DEBUG] Fetching guild member for user ${userId}`);
    const member = await guild.members.fetch(userId);
    if (!member) {
      console.error(`[ERROR] Could not fetch member with ID ${userId}`);
      return false;
    }
    
    console.log(`[DEBUG] Found guild member: ${member.user.tag}`);
    
    // Check if they already have the customer role
    const hasRole = member.roles.cache.has(CUSTOMER_ROLE_ID);
    console.log(`[DEBUG] Member has customer role already? ${hasRole}`);
    
    if (hasRole) {
      console.log(`[INFO] User ${userId} already has the customer role.`);
      return true;
    }
    
    // Check bot's permissions to assign roles
    const botMember = guild.members.cache.get(guild.client.user.id);
    if (!botMember.permissions.has('MANAGE_ROLES')) {
      console.error('[ERROR] Bot doesn\'t have MANAGE_ROLES permission.');
      return false;
    }
    
    // Check if bot's highest role is higher than the customer role
    if (botMember.roles.highest.position <= customerRole.position) {
      console.error(`[ERROR] Bot's highest role (${botMember.roles.highest.name}) is not high enough to assign customer role (${customerRole.name}).`);
      return false;
    }
    
    // Assign the customer role
    console.log(`[DEBUG] Attempting to assign customer role to user ${userId}`);
    await member.roles.add(CUSTOMER_ROLE_ID);
    console.log(`[INFO] Successfully assigned customer role to user ${userId}.`);
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to assign customer role to user ${userId}:`, error.message);
    console.error(error.stack); // Log the full stack trace
    return false;
  }
}

/**
 * Fetches license items for an order from the Easy-product-downloads API.
 * Expects { data: [ { license_key, product_id } ], status: 'success' } or similar.
 * We'll store the product name in item.product for channel matching.
 * @param {string} orderNumber - The Shopify order number.
 * @returns {Object} - { success: boolean, items?: Array<{licenseKey, product}> }
 */
async function fetchLicenseItems(orderNumber) {
  try {
    const response = await axios.post(EASY_DOWNLOADS_API_URL, {
      order_number: orderNumber,
      api_token: EPD_API_TOKEN
    });

    console.log('[DEBUG] Full license API response:', response.data);

    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      const items = [];
      for (const entry of response.data.data) {
        if (entry.license_key) {
          // Store BOTH product name and ID separately to avoid confusion
          items.push({
            licenseKey: entry.license_key,
            productId: entry.product_id || 'unknown-id',
            productName: entry.product || 'unknown-product', // Keep the actual name
            variant: entry.variant || null,
            variantId: entry.variant_id || null
          });
        }
      }
      if (items.length > 0) {
        return { success: true, items };
      }
    }
    return { success: false };
  } catch (error) {
    console.error('[ERROR] License key retrieval error:', error.message);
    return { success: false };
  }
}

/**
 * Validates that a session ID matches an order number via the Stripe API.
 * @param {string} orderNumber - The Shopify order number (including the # if needed).
 * @param {string} sessionId - The Stripe session ID.
 * @returns {Object} - Validation result { valid: boolean, order?: Object }.
 */
async function validateOrderSession(orderNumber, sessionId) {
  try {
    const response = await axios.get(`${STRIPE_API_URL}/order-validation`, {
      params: {
        order_number: orderNumber,
        session_id: sessionId
      }
    });
    return {
      valid: response.data.valid,
      order: response.data.order
    };
  } catch (error) {
    console.error('[ERROR] Order validation error:', error.message);
    return { valid: false };
  }
}

/**
 * Handles the authentication command flow.
 * In DMs, any message triggers the authentication process.
 * If the message does not contain exactly two parts, the user is prompted for the correct format.
 * @param {Object} message - The Discord message object
 * @param {Object} client - The Discord client
 */
async function handleAuthCommand(message, client) {
  // Because we're in a DM, message.guild is null, so fetch your main guild from the client
  const guild = client.guilds.cache.get(MAIN_GUILD_ID);
  if (!guild) {
    console.log('[ERROR] Could not find the main guild. Check MAIN_GUILD_ID.');
    return;
  }

  const userId = message.author.id;
  const parts = message.content.trim().split(/\s+/);

  // Check or initialize the user state
  let state = userState.get(userId);
  if (!state) {
    // No active session
    if (parts.length !== 2) {
      userState.set(userId, { stage: 'awaiting_input', timestamp: Date.now() });
      return message.reply('Please provide your order number and session ID in the following format: `order_number session_id`');
    } else {
      userState.set(userId, { stage: 'awaiting_input', timestamp: Date.now() });
    }
  } else {
    // Check for timeout (10 minutes)
    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
      userState.delete(userId);
      return message.reply('Authentication session timed out. Please start again by sending your order number and session ID.');
    }
  }

  // We now expect exactly two parts
  if (parts.length !== 2) {
    return message.reply('Invalid format. Please provide your information as: `order_number session_id`');
  }

  const [orderNumber, sessionId] = parts;

  try {
    // Let the user know we're processing
    await message.reply('Verifying your information, please wait...');

    // Validate that the session ID matches the order number via Stripe API
    const validationResult = await validateOrderSession(orderNumber, sessionId);
    if (!validationResult.valid) {
      userState.delete(userId);
      return message.reply('❌ Validation failed: The order number and session ID do not match or the order was not found.');
    }

    // Fetch the license key(s) + product info from the Easy-product-downloads API
    const licenseResult = await fetchLicenseItems(orderNumber);
    if (licenseResult.success && licenseResult.items && licenseResult.items.length > 0) {
      // Create DM channel (if not already open)
      const dmChannel = await message.author.createDM();
      await dmChannel.send(`✅ **Verification successful!**\n\nHere are your license keys for order ${orderNumber}:`);

      // Assign the customer role first
      await assignCustomerRole(guild, message.author.id);

      // Keep track of assigned channels for the final message
      const assignedChannels = [];

      for (const item of licenseResult.items) {
        // Send the license key
        await dmChannel.send(`\`\`\`\n${item.licenseKey}\n\`\`\``);

        // Get the product name for debugging
        const productName = item.productName || item.product || "unknown";
        console.log(`[DEBUG] Processing license for product: "${productName}"`);

        // Attempt to find and assign the relevant role with full product info
        const roleResult = await assignProductRole(guild, message.author.id, productName, item);
        
        // If a channel was found and role assigned, store the channel info
        if (roleResult && roleResult.channelId) {
          assignedChannels.push({
            id: roleResult.channelId,
            name: roleResult.channelName,
            product: productName
          });
        }
      }

      // Construct a message with channel links
      let finalMessage = '✅ Verification successful! Your license key(s) and role assignment have been handled.';
      
      if (assignedChannels.length > 0) {
        finalMessage += '\n\n**Please visit the following channel(s) to download your product(s):**';
        
        for (const channel of assignedChannels) {
          finalMessage += `\n- <#${channel.id}> for ${channel.product}`;
        }
      }

      // Notify user in DM and in the reply
      await dmChannel.send(finalMessage);
    } else {
      await message.reply('⚠️ Your order is valid, but we couldn\'t retrieve your license keys. Please contact support for assistance.');
    }

    // Clear the user state
    userState.delete(userId);

  } catch (error) {
    console.error('[ERROR] Authentication error:', error.message);
    message.reply('❌ An error occurred during verification. Please try again later or contact support.');
    userState.delete(userId);
  }
}

/**
 * Enhanced algorithm for matching products to appropriate download channels.
 * Specifically designed for products like "BO6 / Warzone 4 EXTERNAL-CHAIR".
 * 
 * @param {Guild} guild - The Discord guild object.
 * @param {string} userId - The ID of the user to assign the role to.
 * @param {string} productNameOrId - The product name or ID.
 * @param {Object} productInfo - The full product info.
 * @returns {Object} - Result with channelId and channelName if successful
 */
async function assignProductRole(guild, userId, productIdOrName, productInfo = null) {
  // Get the product name - prioritize the full product info
  let productName = "unknown";
  
  if (productInfo) {
    // If productInfo has a productName property, use that
    if (productInfo.productName) {
      productName = String(productInfo.productName);
    }
    // Otherwise if it has a product property (backward compatibility)
    else if (productInfo.product) {
      productName = String(productInfo.product);
    }
  }
  
  // If we still don't have a name, use the ID/name passed in
  if (productName === "unknown") {
    productName = String(productIdOrName || '');
  }
  
  console.log(`[DEBUG] Processing product: "${productName}"`);
  
  // Result object to return channel info
  const result = {
    success: false,
    channelId: null,
    channelName: null,
    roleName: null
  };
  
  // STEP 1: Extract key identifiers from the product name
  const productDetails = extractProductDetails(productName);
  console.log(`[DEBUG] Extracted product details:`, productDetails);
  
  // STEP 2: Find all download channels
  const downloadChannels = guild.channels.cache.filter(ch => 
    ch.isTextBased() && 
    (ch.name.toLowerCase().includes('download') || 
     ch.name.toLowerCase().includes('dl'))
  );
  
  console.log(`[DEBUG] Found ${downloadChannels.size} potential download channels`);
  
  // STEP 3: Score each channel based on match to product details
  const channelScores = [];
  
  for (const channel of downloadChannels.values()) {
    // Clean channel name for matching
    const cleanName = cleanText(channel.name);
    console.log(`[DEBUG] Evaluating channel: ${channel.name} (cleaned: ${cleanName})`);
    
    // Calculate match score
    const score = calculateMatchScore(productDetails, cleanName);
    channelScores.push({ channel, score });
    
    console.log(`[DEBUG] Channel "${channel.name}" scored ${score}`);
  }
  
  // STEP 4: Sort channels by score (highest first) and attempt role assignment
  channelScores.sort((a, b) => b.score - a.score);
  
  // Log top 3 channels for debugging
  console.log(`[DEBUG] Top channel matches:`);
  for (let i = 0; i < Math.min(3, channelScores.length); i++) {
    console.log(`[DEBUG] ${i+1}. "${channelScores[i].channel.name}" with score ${channelScores[i].score}`);
  }
  
  // Start with highest scoring channel
  for (const { channel, score } of channelScores) {
    if (score <= 0) {
      console.log(`[DEBUG] Remaining channels have score <= 0, stopping search`);
      break; // Don't bother with channels that have no match
    }
    
    console.log(`[DEBUG] Trying to find role in: ${channel.name}`);
    
    // Get all role overwrites in this channel
    const roleOverwrites = channel.permissionOverwrites.cache.filter(
      over => over.type === OverwriteType.Role
    );
    
    // Find the first proper buyer role
    for (const overwrite of roleOverwrites.values()) {
      const roleObj = guild.roles.cache.get(overwrite.id);
      
      if (!roleObj) continue;
      
      const roleName = roleObj.name.toLowerCase();
      console.log(`[DEBUG] Examining role: ${roleObj.name}`);
      
      // Skip common admin/utility roles
      if (roleName === '@everyone' || 
          roleName === 'muted' || 
          roleName.includes('admin') || 
          roleName.includes('mod') ||
          roleName.includes('bot')) {
        console.log(`[DEBUG] Skipping admin/utility role: ${roleObj.name}`);
        continue;
      }
      
      // This is likely a buyer role, assign it
      console.log(`[DEBUG] Selected suitable role: ${roleObj.name}`);
      
      try {
        const member = await guild.members.fetch(userId);
        await member.roles.add(roleObj.id);
        console.log(`[INFO] Assigned role "${roleObj.name}" to user ID "${userId}" for product "${productName}".`);
        
        // Store channel info in result
        result.success = true;
        result.channelId = channel.id;
        result.channelName = channel.name;
        result.roleName = roleObj.name;
        
        return result; // Exit after successful assignment
      } catch (err) {
        console.error(`[ERROR] Failed to assign role "${roleObj.name}" to user "${userId}":`, err.message);
      }
    }
    
    console.log(`[DEBUG] No suitable role found in channel "${channel.name}", trying next channel`);
  }
  
  console.log(`[INFO] No suitable role found for product "${productName}" after checking all channels.`);
  return result;
}

/**
 * Extract structured details from a product name.
 * Specifically designed to handle formats like "BO6 / Warzone 4 EXTERNAL-CHAIR"
 */
function extractProductDetails(productName) {
  const name = String(productName || '').toLowerCase();
  
  // Initialize details
  const details = {
    game: null,        // BO6, WZ4, etc.
    type: null,        // EXTERNAL, INTERNAL, etc.
    feature: [],       // CHAIR, BOT, AFK, XP, etc.
    variant: null,     // Day Key, Week Key, etc.
    original: name     // Original name for reference
  };
  
  // Extract game identifier
  if (name.includes('bo6') || name.includes('black ops')) {
    details.game = 'bo6';
  } else if (name.includes('wz4') || name.includes('warzone 4') || name.includes('warzone4')) {
    details.game = 'wz4';
  } else if (name.includes('mw3') || name.includes('modern warfare')) {
    details.game = 'mw3';
  }
  
  // Extract type
  if (name.includes('external')) {
    details.type = 'external';
  } else if (name.includes('internal')) {
    details.type = 'internal';
  }
  
  // Extract features
  const featureKeywords = ['chair', 'bot', 'afk', 'xp', 'cheat', 'aimbot', 'esp', 'hack', 'tool', 't00l'];
  for (const keyword of featureKeywords) {
    if (name.includes(keyword)) {
      details.feature.push(keyword);
    }
  }
  
  // Extract variant
  if (name.includes('day key')) {
    details.variant = 'day';
  } else if (name.includes('week key')) {
    details.variant = 'week';
  } else if (name.includes('month key')) {
    details.variant = 'month';
  }
  
  return details;
}

/**
 * Clean text for comparison by removing emojis, special characters, etc.
 */
function cleanText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1F6FF}\u{1F700}-\u{1FAFF}]/gu, '') // Remove emojis
    .replace(/[\[\]\(\)\{\}\"\'\`\「\」\『\』]/g, '') // Remove various brackets
    .replace(/[^\w\s\-\/]/g, '') // Keep alphanumeric, spaces, hyphens, slashes
    .trim();
}

/**
 * Calculate a match score between product details and a channel name.
 * Higher scores indicate better matches.
 */
function calculateMatchScore(productDetails, channelName) {
  let score = 0;
  
  // Game match (most important)
  if (productDetails.game && channelName.includes(productDetails.game)) {
    score += 100;
  }
  
  // Type match (external/internal)
  if (productDetails.type && channelName.includes(productDetails.type)) {
    score += 75;
  }
  
  // Feature matches
  for (const feature of productDetails.feature) {
    if (channelName.includes(feature)) {
      score += 50;
    }
  }
  
  // Highly specific match bonuses
  if (productDetails.game === 'bo6' && 
      productDetails.type === 'external' && 
      productDetails.feature.includes('chair') &&
      channelName.includes('bo6') &&
      channelName.includes('external') &&
      channelName.includes('chair')) {
    score += 200; // Very specific BO6 EXTERNAL-CHAIR match
  }
  
  // Other common combinations
  if (productDetails.game === 'wz4' && 
      channelName.includes('afk') && 
      channelName.includes('xp') &&
      channelName.includes('bot')) {
    score += 100; // WZ4 AFK XP BOT pattern
  }
  
  return score;
}

module.exports = {
  handleAuthCommand,
  fetchLicenseItems,
  validateOrderSession,
  assignCustomerRole
};

console.log('auth-command exports:', module.exports);