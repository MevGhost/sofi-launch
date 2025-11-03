// modules/product/matcher.js - Match products to channels (continued)

const { createLogger } = require('../utils/logger');
const { cleanText } = require('../utils/textUtils');
const { extractProductDetails } = require('./extractor');
const { calculateMatchScore } = require('./scoring');
const logger = createLogger('ProductMatcher');

/**
 * Find the best matching channel for a product
 * @param {string} productName - Product name
 * @param {Collection} channels - Discord channels collection
 * @returns {Object} - Best matching channel and score
 */
function findBestChannel(productName, channels) {
  // Extract product details
  const productDetails = extractProductDetails(productName);
  logger.debug(`Finding best channel for product: "${productName}"`);
  
  // Filter to only download channels
  const downloadChannels = channels.filter(ch => 
    ch.isTextBased() && 
    (ch.name.toLowerCase().includes('download') || 
     ch.name.toLowerCase().includes('dl'))
  );
  
  logger.debug(`Found ${downloadChannels.size} potential download channels`);
  
  // Score each channel
  const channelScores = [];
  
  for (const channel of downloadChannels.values()) {
    // Clean channel name for matching
    const cleanName = cleanText(channel.name);
    logger.debug(`Evaluating channel: ${channel.name} (cleaned: ${cleanName})`);
    
    // Calculate match score
    const score = calculateMatchScore(productDetails, cleanName);
    channelScores.push({ channel, score });
    
    logger.debug(`Channel "${channel.name}" scored ${score}`);
  }
  
  // Sort channels by score (highest first)
  channelScores.sort((a, b) => b.score - a.score);
  
  // Log top 3 channels for debugging
  logger.debug(`Top channel matches:`);
  for (let i = 0; i < Math.min(3, channelScores.length); i++) {
    logger.debug(`${i+1}. "${channelScores[i].channel.name}" with score ${channelScores[i].score}`);
  }
  
  // Check if we have any channels with a score
  if (channelScores.length === 0 || channelScores[0].score <= 0) {
    logger.debug(`No suitable channels found for product "${productName}"`);
    return { channel: null, score: 0 };
  }
  
  // Return the best channel
  return { 
    channel: channelScores[0].channel, 
    score: channelScores[0].score 
  };
}

/**
 * Find the first non-admin role in a channel
 * @param {Channel} channel - Discord channel
 * @param {Guild} guild - Discord guild
 * @returns {Role|null} - Role object or null if none found
 */
function findRoleInChannel(channel, guild) {
  logger.debug(`Finding role in channel: ${channel.name}`);
  
  // Get role overwrites
  const roleOverwrites = channel.permissionOverwrites.cache.filter(
    over => over.type === 0 // 0 = Role, 1 = Member
  );
  
  logger.debug(`Channel ${channel.name} has ${roleOverwrites.size} role overwrites`);
  
  // IDs of roles to exclude (add the ULTIMATE-AIO-BUYER role ID here)
  const excludedRoleIds = ['1116160416398192761'];
  
  // Extract keywords from channel name
  const channelNameLower = channel.name.toLowerCase();
  const channelKeywords = channelNameLower.split(/[-_\s]+/).filter(k => k.length > 1);
  
  let bestRole = null;
  let bestScore = -1;
  
  // Look for a suitable buyer role
  for (const overwrite of roleOverwrites.values()) {
    const roleObj = guild.roles.cache.get(overwrite.id);
    
    if (!roleObj) continue;
    
    // Skip excluded roles by ID
    if (excludedRoleIds.includes(roleObj.id)) {
      logger.debug(`Skipping excluded role: ${roleObj.name}`);
      continue;
    }
    
    const roleName = roleObj.name.toLowerCase();
    logger.debug(`Examining role: ${roleObj.name}`);
    
    // Skip common admin/utility roles
    if (roleName === '@everyone' || 
        roleName === 'muted' || 
        roleName.includes('admin') || 
        roleName.includes('mod') ||
        roleName.includes('bot')) {
      logger.debug(`Skipping admin/utility role: ${roleObj.name}`);
      continue;
    }
    
    // Skip the ULTIMATE-AIO-BUYER role by name as well just to be safe
    if (roleName.includes('ultimate-aio') || roleName.includes('ultimate aio')) {
      logger.debug(`Skipping ULTIMATE-AIO-BUYER role: ${roleObj.name}`);
      continue;
    }
    
    // This is likely a buyer role - use it if it has any product-specific keywords
    if (roleName.includes('bo6') && channelNameLower.includes('bo6')) {
      logger.debug(`Selected product-specific role: ${roleObj.name}`);
      return roleObj;
    }
    
    if (roleName.includes('external') && channelNameLower.includes('external')) {
      logger.debug(`Selected product-specific role: ${roleObj.name}`);
      return roleObj;
    }
    
    // If no product-specific role found yet, keep this as a candidate
    if (bestRole === null) {
      bestRole = roleObj;
    }
  }
  
  if (bestRole) {
    logger.debug(`Selected suitable role: ${bestRole.name}`);
    return bestRole;
  }
  
  logger.debug(`No suitable role found in channel "${channel.name}"`);
  return null;
}/**
 * Find the best channel and role for a product
 * @param {string} productName - Product name
 * @param {Guild} guild - Discord guild
 * @returns {Object} - Result with channel and role information
 */
function findBestChannelAndRole(productName, guild) {
  // Find the best channel
  const { channel, score } = findBestChannel(productName, guild.channels.cache);
  
  if (!channel) {
    return {
      success: false,
      message: `No suitable channel found for product "${productName}"`
    };
  }
  
  // Find role in the channel
  const role = findRoleInChannel(channel, guild);
  
  if (!role) {
    return {
      success: false,
      message: `No suitable role found in channel "${channel.name}"`,
      channelId: channel.id,
      channelName: channel.name
    };
  }
  
  return {
    success: true,
    channelId: channel.id,
    channelName: channel.name,
    roleId: role.id,
    roleName: role.name
  };
}

module.exports = {
  findBestChannel,
  findRoleInChannel,
  findBestChannelAndRole
};
