// modules/utils/textUtils.js - Text processing utilities

/**
 * Clean text for comparison by removing emojis, special characters, etc.
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
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
 * Normalize product or channel name for matching
 * @param {string} name - Name to normalize
 * @returns {string} - Normalized name
 */
function normalizeName(name) {
  return cleanText(name)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Normalize multiple hyphens
}

/**
 * Check if a string contains another string, ignoring case and special characters
 * @param {string} haystack - String to search in
 * @param {string} needle - String to search for
 * @returns {boolean} - Whether the needle was found
 */
function fuzzyIncludes(haystack, needle) {
  return cleanText(haystack).includes(cleanText(needle));
}

module.exports = {
  cleanText,
  normalizeName,
  fuzzyIncludes
};
