// modules/utils/index.js - Export utilities

const textUtils = require('./textUtils');
const logger = require('./logger');

module.exports = {
  ...textUtils,
  ...logger
};
