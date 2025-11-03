// modules/product/extractor.js - Extract details from product names

const { createLogger } = require('../utils/logger');
const logger = createLogger('ProductExtractor');

/**
 * Extract structured details from a product name.
 * Specifically designed to handle formats like "BO6 / Warzone 4 EXTERNAL-CHAIR"
 * @param {string} productName - Product name to extract details from
 * @returns {Object} - Extracted details
 */
function extractProductDetails(productName) {
  const name = String(productName || '').toLowerCase();
  
  // Initialize details
  const details = {
    game: null,        // BO6, WZ4, etc.
    type: null,        // EXTERNAL, INTERNAL, etc.
    feature: [],       // CHAIR, BOT, AFK, XP, UNLOCK ALL, etc.
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
  } else if (name.includes('mw19') || name.includes('modern warfare 2019')) {
    details.game = 'mw19';
  } else if (name.includes('cw') || name.includes('cold war')) {
    details.game = 'cw';
  } else if (name.includes('valorant')) {
    details.game = 'valorant';
  } else if (name.includes('rust')) {
    details.game = 'rust';
  } else if (name.includes('csgo') || name.includes('cs2')) {
    details.game = 'csgo2';
  } else if (name.includes('fortnite')) {
    details.game = 'fortnite';
  } else if (name.includes('marvel') && name.includes('rivals')) {
    details.game = 'marvel-rivals';
  }
  
  // Extract type
  if (name.includes('external')) {
    details.type = 'external';
  } else if (name.includes('internal')) {
    details.type = 'internal';
  } else if (name.includes('menu')) {
    details.type = 'menu';
  }
  
  // Extract features - expanded list with more specific features
  const featureKeywords = [
    // Common features
    'chair', 'bot', 'afk', 'xp', 'cheat', 'aimbot', 'esp', 'hack', 'tool', 't00l',
    // Unlock features
    'unlock all', 'unlocker', 'unlock', 'camo', 'dark aether', 'swapper',
    // Special products
    'vip', 'luther', 'sp00fer', 'woofer', 'perm', 'temp', 'blocker', 
    'premium', 'special', 'aio', 'mini', 'gen', 'genv2',
    // Other features
    'radar', 'uav', 'lobby', 'force', 'save', 'forcesave', 'ldv2', 'eac', 'be'
  ];
  
  for (const keyword of featureKeywords) {
    if (name.includes(keyword)) {
      details.feature.push(keyword);
    }
  }
  
  // Special case handling for different product types
  
  // Check for special case "unlock all" which might be written in different ways
  if (name.includes('unlock all') || name.includes('unlock-all') || 
      name.includes('unlockall') || name.includes('unlocker') || 
      name.includes('simple unlock') ||
      (name.includes('unlock') && !name.includes('camo'))) {
    if (!details.feature.includes('unlock all')) {
      details.feature.push('unlock all');
    }
  }
  
  // Check for special case "force save" or "forcesave"
  if (name.includes('force save') || name.includes('forcesave')) {
    if (!details.feature.includes('forcesave')) {
      details.feature.push('forcesave');
    }
  }
  
  // Check for "AIO" (All-In-One) products
  if (name.includes('aio') || name.includes('all in one')) {
    if (!details.feature.includes('aio')) {
      details.feature.push('aio');
    }
  }
  
  // Check for spoofer-related products
  if (name.includes('spoof') || name.includes('sp00f')) {
    if (!details.feature.includes('sp00fer')) {
      details.feature.push('sp00fer');
    }
  }
  
  // Extract variant
  if (name.includes('day key')) {
    details.variant = 'day';
  } else if (name.includes('week key')) {
    details.variant = 'week';
  } else if (name.includes('month key')) {
    details.variant = 'month';
  } else if (name.includes('perm')) {
    details.variant = 'perm';
  } else if (name.includes('temp')) {
    details.variant = 'temp';
  }
  
  logger.debug(`Extracted details for "${productName}":`, details);
  return details;
}

module.exports = {
  extractProductDetails
};
