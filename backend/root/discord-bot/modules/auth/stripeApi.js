// modules/auth/stripeApi.js - Stripe API integration

const axios = require('axios');
const config = require('../../config');
const { createLogger } = require('../utils/logger');
const logger = createLogger('StripeAPI');

/**
 * Validates that a session ID matches an order number via the Stripe API.
 * @param {string} orderNumber - The Shopify order number (including the # if needed).
 * @param {string} sessionId - The Stripe session ID.
 * @returns {Promise<Object>} - Validation result { valid: boolean, order?: Object }.
 */
async function validateOrderSession(orderNumber, sessionId) {
  try {
    logger.info(`Validating order: ${orderNumber} with session: ${sessionId}`);
    
    const response = await axios.get(`${config.STRIPE_API_URL}/order-validation`, {
      params: {
        order_number: orderNumber,
        session_id: sessionId
      }
    });
    
    if (response.data.valid) {
      logger.info(`Order validation successful: ${orderNumber}`);
    } else {
      logger.warn(`Order validation failed: ${orderNumber}`);
    }
    
    return {
      valid: response.data.valid,
      order: response.data.order
    };
  } catch (error) {
    logger.error(`Order validation error for ${orderNumber}:`, error.message);
    return { valid: false };
  }
}

module.exports = {
  validateOrderSession
};
