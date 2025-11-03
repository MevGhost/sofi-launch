// modules/auth/licenseApi.js - License API integration

const axios = require('axios');
const config = require('../../config');
const { createLogger } = require('../utils/logger');
const logger = createLogger('LicenseAPI');

/**
 * Fetches license items for an order from the Easy-product-downloads API.
 * @param {string} orderNumber - The Shopify order number.
 * @returns {Promise<Object>} - { success: boolean, items?: Array<{licenseKey, product}> }
 */
async function fetchLicenseItems(orderNumber) {
  try {
    logger.info(`Fetching license items for order: ${orderNumber}`);
    
    const response = await axios.post(config.EASY_DOWNLOADS_API_URL, {
      order_number: orderNumber,
      api_token: config.EPD_API_TOKEN
    });

    logger.debug('License API response:', response.data);

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
        logger.info(`Found ${items.length} license items for order: ${orderNumber}`);
        return { success: true, items };
      } else {
        logger.warn(`No license items found for order: ${orderNumber}`);
      }
    } else {
      logger.warn(`Invalid response from license API for order: ${orderNumber}`);
    }
    
    return { success: false };
  } catch (error) {
    logger.error(`License key retrieval error for ${orderNumber}:`, error.message);
    return { success: false };
  }
}

module.exports = {
  fetchLicenseItems
};
