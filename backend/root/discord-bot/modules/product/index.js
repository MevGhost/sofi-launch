// modules/product/index.js - Export product matching functionality

const extractor = require('./extractor');
const scoring = require('./scoring');
const matcher = require('./matcher');

module.exports = {
  ...extractor,
  ...scoring,
  ...matcher
};
