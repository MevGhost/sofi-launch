// modules/auth/roleManager.js - Role assignment functions

const config = require('../../config');
const { createLogger } = require('../utils/logger');
const { findBestChannelAndRole } = require('../product/matcher');
const logger = createLogger('RoleManager');

/**
 * Assigns the customer role to a user if they don't already have it.
 * @param {Guild} guild - The Discord guild object.
 * @param {string} userId - The ID of the user to assign the role to.
 * @returns {Promise<boolean>} - Whether the role was assigned or already present.
 */
async function assignCustomerRole(guild, userId) {
  try {
    logger.debug(`Starting customer role assignment for user ${userId}`);
    
    // First check if the role exists in the guild
    const customerRole = guild.roles.cache.get(config.CUSTOMER_ROLE_ID);
    if (!customerRole) {
      logger.error(`Customer role with ID ${config.CUSTOMER_ROLE_ID} not found in guild.`);
      // Try to list some roles from the guild for debugging
      const someRoles = Array.from(guild.roles.cache.values()).slice(0, 5);
      logger.debug(`Sample roles in guild: ${someRoles.map(r => `${r.name} (${r.id})`).join(', ')}`);
      return false;
    }
    
    logger.debug(`Found customer role: ${customerRole.name} (${customerRole.id})`);
    
    // Fetch the guild member
    logger.debug(`Fetching guild member for user ${userId}`);
    const member = await guild.members.fetch(userId);
    if (!member) {
      logger.error(`Could not fetch member with ID ${userId}`);
      return false;
    }
    
    logger.debug(`Found guild member: ${member.user.tag}`);
    
    // Check if they already have the customer role
    const hasRole = member.roles.cache.has(config.CUSTOMER_ROLE_ID);
    logger.debug(`Member has customer role already? ${hasRole}`);
    
    if (hasRole) {
      logger.info(`User ${userId} already has the customer role.`);
      return true;
    }
    
    // Check bot's permissions to assign roles
    const botMember = guild.members.cache.get(guild.client.user.id);
    if (!botMember.permissions.has('MANAGE_ROLES')) {
      logger.error(`Bot doesn't have MANAGE_ROLES permission.`);
      return false;
    }
    
    // Check if bot's highest role is higher than the customer role
    if (botMember.roles.highest.position <= customerRole.position) {
      logger.error(`Bot's highest role (${botMember.roles.highest.name}) is not high enough to assign customer role (${customerRole.name}).`);
      return false;
    }
    
    // Assign the customer role
    logger.debug(`Attempting to assign customer role to user ${userId}`);
    await member.roles.add(config.CUSTOMER_ROLE_ID);
    logger.info(`Successfully assigned customer role to user ${userId}.`);
    return true;
  } catch (error) {
    logger.error(`Failed to assign customer role to user ${userId}:`, error.message);
    logger.error(error.stack); // Log the full stack trace
    return false;
  }
}

/**
 * Assigns the appropriate product role to a user based on their purchase.
 * @param {Guild} guild - The Discord guild object.
 * @param {string} userId - The ID of the user to assign the role to.
 * @param {string} productName - The product name from the license data.
 * @param {Object} productInfo - Additional product information.
 * @returns {Promise<Object>} - Result with success status and channel information.
 */
async function assignProductRole(guild, userId, productName, productInfo = null) {
  try {
    // Use productName from productInfo if available
    let productDisplayName = productName;
    if (productInfo && productInfo.productName) {
      productDisplayName = productInfo.productName;
    }
    
    logger.info(`Assigning role for product "${productDisplayName}" to user ${userId}`);
    
    // Find the best channel and role using the product matcher
    const result = findBestChannelAndRole(productDisplayName, guild);
    
    if (!result.success) {
      logger.warn(result.message);
      return result;
    }
    
    // Assign the role to the user
    try {
      const member = await guild.members.fetch(userId);
      await member.roles.add(result.roleId);
      logger.info(`Assigned role "${result.roleName}" to user ${userId} for product "${productDisplayName}"`);
      
      return {
        success: true,
        channelId: result.channelId,
        channelName: result.channelName,
        roleName: result.roleName,
        productName: productDisplayName
      };
    } catch (err) {
      logger.error(`Failed to assign role "${result.roleName}" to user ${userId}:`, err.message);
      return {
        success: false,
        message: `Failed to assign role: ${err.message}`
      };
    }
  } catch (error) {
    logger.error(`Error in assignProductRole for ${productName}:`, error.message);
    return {
      success: false,
      message: `Error assigning role: ${error.message}`
    };
  }
}

module.exports = {
  assignCustomerRole,
  assignProductRole
};
