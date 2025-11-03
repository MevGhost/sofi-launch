// modules/auth/index.js - Export auth functionality

const authHandler = require('./authHandler');
const licenseApi = require('./licenseApi');
const stripeApi = require('./stripeApi');
const roleManager = require('./roleManager');

module.exports = {
  ...authHandler,
  ...licenseApi,
  ...stripeApi,
  ...roleManager
};
