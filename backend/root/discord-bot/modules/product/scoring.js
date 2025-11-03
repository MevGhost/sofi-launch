// modules/product/scoring.js - Score products against channel names

const { createLogger } = require('../utils/logger');
const logger = createLogger('ProductScoring');

/**
 * Calculate a match score between product details and a channel name.
 * Higher scores indicate better matches.
 * @param {Object} productDetails - Details extracted from a product name
 * @param {string} channelName - Channel name to match against
 * @returns {number} - Match score
 */
function calculateMatchScore(productDetails, channelName) {
  let score = 0;
  
  // Game match (most important)
  if (productDetails.game && channelName.includes(productDetails.game)) {
    score += 100;
    logger.debug(`Game match (${productDetails.game}): +100`);
  }
  
  // Type match (external/internal/menu)
  if (productDetails.type && channelName.includes(productDetails.type)) {
    score += 75;
    logger.debug(`Type match (${productDetails.type}): +75`);
  }
  
  // For chairs, check for keyword conflicts
  if (productDetails.feature.includes('chair')) {
    // If product doesn't mention external but channel does, reduce score
    if (!productDetails.original.toLowerCase().includes('external') && 
        channelName.toLowerCase().includes('external')) {
      score -= 100; // Penalize external channel for non-external products
      logger.debug(`Chair type mismatch (external in channel but not in product): -100`);
    }
    
    // Similarly for other specific chair types
    if (!productDetails.original.toLowerCase().includes('ldv2') && 
        channelName.toLowerCase().includes('ldv2')) {
      score -= 100;
      logger.debug(`Chair type mismatch (ldv2 in channel but not in product): -100`);
    }
  }
  
  // Feature matches - with weighted scoring
  for (const feature of productDetails.feature) {
    if (channelName.includes(feature)) {
      // Calculate score based on the specificity of the feature
      let featureScore = getFeatureScore(feature, channelName);
      score += featureScore;
      logger.debug(`Feature match (${feature}): +${featureScore}`);
    }
  }
  
  // Specific product pattern bonuses
  score += getProductPatternBonuses(productDetails, channelName);
  
  // Exact channel name match bonus - if the game and every feature is in the channel name
  if (isExactChannelMatch(productDetails, channelName)) {
    score += 500;
    logger.debug('Exact channel match: +500');
  }
  
  logger.debug(`Final score for channel "${channelName}": ${score}`);
  return score;
}

/**
 * Get score for a specific feature match
 * @param {string} feature - Feature to score
 * @param {string} channelName - Channel name
 * @returns {number} - Feature score
 */
function getFeatureScore(feature, channelName) {
  // Higher scores for more specific features
  switch (feature) {
    // Unlock features
    case 'unlock all':
    case 'unlocker':
      if (channelName.includes('unlock-all') || channelName.includes('unlock all') || 
          channelName.includes('unlockall') || channelName.includes('unlocker')) {
        return 200; // Very high score for exact unlock all match
      } else if (channelName.includes('unlock')) {
        return 150; // Still high for partial match
      }
      return 50;
      
    case 'unlock':
      if (!channelName.includes('camo') && !channelName.includes('swapper')) {
        return 150;
      }
      return 50;
      
    // Special features
    case 'forcesave':
    case 'force save':
      if (channelName.includes('forcesave') || channelName.includes('force-save')) {
        return 200;
      }
      return 50;
      
    case 'chair':
      if (channelName.includes('chair')) {
        return 150;
      }
      return 50;
      
    case 'camo':
      if (channelName.includes('camo')) {
        return 150;
      }
      return 50;
      
    case 'sp00fer':
    case 'woofer':
      if (channelName.includes('sp00fer') || channelName.includes('woofer')) {
        return 200;
      }
      return 50;
      
    case 'vip':
    case 'luther':
      if (channelName.includes('vip') || channelName.includes('luther')) {
        return 150;
      }
      return 50;
      
    case 'aio':
      if (channelName.includes('aio')) {
        return 150;
      }
      return 50;
      
    case 'radar':
    case 'uav':
      if (channelName.includes('radar') || channelName.includes('uav')) {
        return 150;
      }
      return 50;
      
    // Default for less specific features
    default:
      return 50;
  }
}

/**
 * Get bonus scores for specific product patterns
 * @param {Object} productDetails - Product details
 * @param {string} channelName - Channel name
 * @returns {number} - Bonus score
 */
function getProductPatternBonuses(productDetails, channelName) {
  let bonus = 0;
  
  // Highly specific match bonuses for common products
  
  // BO6 EXTERNAL CHAIR
  if (productDetails.game === 'bo6' && 
      productDetails.type === 'external' && 
      productDetails.feature.includes('chair') &&
      channelName.includes('bo6') &&
      channelName.includes('external') &&
      channelName.includes('chair')) {
    bonus += 200;
    logger.debug('BO6 EXTERNAL CHAIR pattern match: +200');
  }
  
  // BO6 UNLOCK ALL
  if (productDetails.game === 'bo6' && 
      productDetails.feature.includes('unlock all') &&
      channelName.includes('bo6') &&
      (channelName.includes('unlock') || channelName.includes('unlocker'))) {
    bonus += 300;
    logger.debug('BO6 UNLOCK ALL pattern match: +300');
  }
  
  // MW19 CHAIR
  if (productDetails.game === 'mw19' && 
      productDetails.feature.includes('chair') &&
      channelName.includes('mw19') &&
      channelName.includes('chair')) {
    bonus += 200;
    logger.debug('MW19 CHAIR pattern match: +200');
  }
  
  // WZ4 AFK XP BOT
  if (productDetails.game === 'wz4' && 
      productDetails.feature.includes('afk') && 
      productDetails.feature.includes('xp') &&
      channelName.includes('wz4') &&
      channelName.includes('afk') && 
      channelName.includes('xp') &&
      channelName.includes('bot')) {
    bonus += 300;
    logger.debug('WZ4 AFK XP BOT pattern match: +300');
  }
  
  // SPOOFER/WOOFER specific products
  if ((productDetails.feature.includes('sp00fer') || 
       productDetails.feature.includes('woofer')) &&
      (channelName.includes('sp00fer') || 
       channelName.includes('woofer'))) {
    // Extra check for perm/temp variants
    if (productDetails.variant === 'perm' && channelName.includes('perm')) {
      bonus += 300;
      logger.debug('PERM SPOOFER pattern match: +300');
    } else if (productDetails.variant === 'temp' && channelName.includes('temp')) {
      bonus += 300;
      logger.debug('TEMP SPOOFER pattern match: +300');
    } else {
      bonus += 200;
      logger.debug('SPOOFER pattern match: +200');
    }
  }
  
  return bonus;
}

/**
 * Check if a channel is an exact match for a product
 * @param {Object} productDetails - Product details
 * @param {string} channelName - Channel name
 * @returns {boolean} - Whether the channel is an exact match
 */
function isExactChannelMatch(productDetails, channelName) {
  // Must have game match
  if (!productDetails.game || !channelName.includes(productDetails.game)) {
    return false;
  }
  
  // For each feature in the product, check if it's in the channel name
  const significantFeatures = productDetails.feature.filter(f => 
    ['chair', 'unlock all', 'unlocker', 'aio', 'vip', 'luther', 
     'sp00fer', 'woofer', 'forcesave', 'force-save', 'radar', 'uav'].includes(f)
  );
  
  if (significantFeatures.length === 0) {
    return false;
  }
  
  // Check if ALL significant features are in the channel name
  return significantFeatures.every(feature => channelName.includes(feature));
}

module.exports = {
  calculateMatchScore
};