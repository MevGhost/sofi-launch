// modules/utils/logger.js - Logging utilities

/**
 * Formats a timestamp for logging
 * @returns {string} - Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substr(0, 19);
}

/**
 * Logger class with various log levels
 */
class Logger {
  constructor(module) {
    this.module = module;
  }

  /**
   * Log a debug message
   * @param {string} message - Message to log
   * @param {any} data - Optional data to log
   */
  debug(message, data = null) {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [DEBUG] [${this.module}] ${message}`);
    if (data !== null) {
      console.log(data);
    }
  }

  /**
   * Log an info message
   * @param {string} message - Message to log
   * @param {any} data - Optional data to log
   */
  info(message, data = null) {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [INFO] [${this.module}] ${message}`);
    if (data !== null) {
      console.log(data);
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Message to log
   * @param {any} data - Optional data to log
   */
  warn(message, data = null) {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [WARN] [${this.module}] ${message}`);
    if (data !== null) {
      console.log(data);
    }
  }

  /**
   * Log an error message
   * @param {string} message - Message to log
   * @param {Error|string} error - Error to log
   */
  error(message, error = null) {
    const timestamp = getTimestamp();
    console.error(`[${timestamp}] [ERROR] [${this.module}] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else {
        console.error(error);
      }
    }
  }
}

/**
 * Create a logger for a module
 * @param {string} module - Module name
 * @returns {Logger} - Logger instance
 */
function createLogger(module) {
  return new Logger(module);
}

module.exports = {
  createLogger
};
