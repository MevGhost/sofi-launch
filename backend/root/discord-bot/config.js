// config.js - Configuration settings for the bot
require('dotenv').config();

// API settings
const EPD_API_TOKEN = process.env.EPD_API_TOKEN || 'YOUR_API_TOKEN';
const STRIPE_API_URL = process.env.STRIPE_API_URL || 'http://localhost:3000';
const EASY_DOWNLOADS_API_URL = process.env.EASY_DOWNLOADS_API_URL || 'https://their-site.com/api/get-license-keys-by-order';

// Product API settings (for channel status updates)
const PRODUCT_API_ENDPOINT = process.env.PRODUCT_API_ENDPOINT;
const API_SECRET = process.env.API_SECRET;
const DEFAULT_PRODUCT_ID = process.env.DEFAULT_PRODUCT_ID || 'unknown';

// Discord settings
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const MAIN_GUILD_ID = process.env.MAIN_GUILD_ID || 'YOUR_GUILD_ID';

// Role IDs
const CUSTOMER_ROLE_ID = '1116159974918332466';

// Auth timeout (in milliseconds)
const AUTH_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// Channel scanning interval (in milliseconds)
const CHANNEL_SCAN_INTERVAL = 10 * 60 * 30;

module.exports = {
  EPD_API_TOKEN,
  STRIPE_API_URL,
  EASY_DOWNLOADS_API_URL,
  PRODUCT_API_ENDPOINT,
  API_SECRET,
  DEFAULT_PRODUCT_ID,
  DISCORD_BOT_TOKEN,
  MAIN_GUILD_ID,
  CUSTOMER_ROLE_ID,
  AUTH_TIMEOUT,
  CHANNEL_SCAN_INTERVAL
};
