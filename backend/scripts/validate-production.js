#!/usr/bin/env node

/**
 * Production Validation Script
 * Validates that the application is properly configured for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n${'='.repeat(50)}`),
};

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  async validate() {
    log.header('🚀 S4 Labs Production Validation');
    
    await this.checkEnvironment();
    await this.checkDependencies();
    await this.checkBuild();
    await this.checkDatabase();
    await this.checkRedis();
    await this.checkAPIEndpoints();
    await this.checkWebSocket();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkLogs();
    
    this.printSummary();
  }

  async checkEnvironment() {
    log.header('Environment Variables');
    
    // Required environment variables
    const required = [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'JWT_SECRET',
      'ALLOWED_ORIGINS',
    ];
    
    const recommended = [
      'REDIS_URL',
      'SENTRY_DSN',
      'LOG_LEVEL',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
    ];
    
    // Check required variables
    for (const env of required) {
      if (process.env[env]) {
        log.success(`${env} is set`);
        
        // Special checks
        if (env === 'NODE_ENV' && process.env[env] !== 'production') {
          this.warnings.push(`NODE_ENV is '${process.env[env]}', should be 'production'`);
          log.warning(`NODE_ENV is '${process.env[env]}', should be 'production'`);
        }
        
        if (env === 'JWT_SECRET' && process.env[env].length < 32) {
          this.errors.push('JWT_SECRET is too short (minimum 32 characters)');
          log.error('JWT_SECRET is too short (minimum 32 characters)');
        }
        
        if (env === 'DATABASE_URL' && process.env[env].includes('password')) {
          this.errors.push('DATABASE_URL contains plain text "password"');
          log.error('DATABASE_URL contains plain text "password"');
        }
      } else {
        this.errors.push(`${env} is not set`);
        log.error(`${env} is not set`);
      }
    }
    
    // Check recommended variables
    for (const env of recommended) {
      if (process.env[env]) {
        log.success(`${env} is set (recommended)`);
      } else {
        this.warnings.push(`${env} is not set (recommended for production)`);
        log.warning(`${env} is not set (recommended for production)`);
      }
    }
  }

  async checkDependencies() {
    log.header('Dependencies');
    
    try {
      // Check for vulnerabilities
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditOutput);
      
      if (audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0) {
        this.errors.push(`Found ${audit.metadata.vulnerabilities.high} high and ${audit.metadata.vulnerabilities.critical} critical vulnerabilities`);
        log.error(`Found ${audit.metadata.vulnerabilities.high} high and ${audit.metadata.vulnerabilities.critical} critical vulnerabilities`);
      } else if (audit.metadata.vulnerabilities.moderate > 0) {
        this.warnings.push(`Found ${audit.metadata.vulnerabilities.moderate} moderate vulnerabilities`);
        log.warning(`Found ${audit.metadata.vulnerabilities.moderate} moderate vulnerabilities`);
      } else {
        log.success('No security vulnerabilities found');
      }
    } catch (error) {
      // npm audit returns non-zero exit code if vulnerabilities found
      log.warning('npm audit found issues (run npm audit for details)');
    }
    
    // Check for outdated packages
    try {
      const outdated = execSync('npm outdated --json', { encoding: 'utf8' });
      if (outdated) {
        const packages = JSON.parse(outdated);
        const count = Object.keys(packages).length;
        if (count > 0) {
          this.warnings.push(`${count} packages are outdated`);
          log.warning(`${count} packages are outdated`);
        }
      } else {
        log.success('All packages are up to date');
      }
    } catch (error) {
      // npm outdated returns non-zero if packages are outdated
      log.info('Some packages may be outdated (run npm outdated for details)');
    }
  }

  async checkBuild() {
    log.header('Build Status');
    
    // Check if dist directory exists
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      log.success('Backend build directory exists');
      
      // Check if index.js exists
      const indexPath = path.join(distPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        log.success('Backend entry point exists');
        
        // Check build timestamp
        const stats = fs.statSync(indexPath);
        const ageInHours = (Date.now() - stats.mtime) / 1000 / 60 / 60;
        if (ageInHours > 24) {
          this.warnings.push('Build is more than 24 hours old');
          log.warning('Build is more than 24 hours old');
        }
      } else {
        this.errors.push('Backend entry point not found');
        log.error('Backend entry point not found');
      }
    } else {
      this.errors.push('Backend not built');
      log.error('Backend not built (run npm run build)');
    }
    
    // Check frontend build
    const frontendBuildPath = path.join(__dirname, '..', '..', '.next');
    if (fs.existsSync(frontendBuildPath)) {
      log.success('Frontend build directory exists');
    } else {
      this.errors.push('Frontend not built');
      log.error('Frontend not built (run npm run build in root)');
    }
  }

  async checkDatabase() {
    log.header('Database Connection');
    
    if (!process.env.DATABASE_URL) {
      log.error('DATABASE_URL not set, skipping database check');
      return;
    }
    
    try {
      const { PrismaClient } = require('../generated/prisma');
      const prisma = new PrismaClient();
      
      // Test connection
      await prisma.$connect();
      log.success('Database connection successful');
      
      // Check for pending migrations
      const migrations = await prisma.$queryRaw`
        SELECT migration_name 
        FROM _prisma_migrations 
        WHERE finished_at IS NULL
      `;
      
      if (migrations && migrations.length > 0) {
        this.errors.push(`${migrations.length} pending migrations`);
        log.error(`${migrations.length} pending migrations`);
      } else {
        log.success('All migrations applied');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      this.errors.push(`Database connection failed: ${error.message}`);
      log.error(`Database connection failed: ${error.message}`);
    }
  }

  async checkRedis() {
    log.header('Redis Connection');
    
    if (!process.env.REDIS_URL) {
      log.warning('REDIS_URL not set, skipping Redis check');
      return;
    }
    
    try {
      const { createClient } = require('redis');
      const client = createClient({ url: process.env.REDIS_URL });
      
      await client.connect();
      await client.ping();
      log.success('Redis connection successful');
      await client.quit();
    } catch (error) {
      this.warnings.push(`Redis connection failed: ${error.message}`);
      log.warning(`Redis connection failed: ${error.message}`);
    }
  }

  async checkAPIEndpoints() {
    log.header('API Endpoints');
    
    const port = process.env.PORT || 4000;
    const endpoints = [
      { path: '/health', expected: 200 },
      { path: '/health/detailed', expected: 200 },
      { path: '/api/stats', expected: 200 },
    ];
    
    for (const endpoint of endpoints) {
      await new Promise((resolve) => {
        const url = `http://localhost:${port}${endpoint.path}`;
        
        http.get(url, (res) => {
          if (res.statusCode === endpoint.expected) {
            log.success(`${endpoint.path} - Status ${res.statusCode}`);
          } else {
            this.errors.push(`${endpoint.path} returned ${res.statusCode}, expected ${endpoint.expected}`);
            log.error(`${endpoint.path} returned ${res.statusCode}, expected ${endpoint.expected}`);
          }
          res.resume();
          resolve();
        }).on('error', (err) => {
          this.errors.push(`${endpoint.path} - ${err.message}`);
          log.error(`${endpoint.path} - ${err.message}`);
          resolve();
        });
      });
    }
  }

  async checkWebSocket() {
    log.header('WebSocket Connection');
    
    const port = process.env.PORT || 4000;
    
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${port}`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          log.success('WebSocket connection successful');
          ws.close();
          resolve();
        });
        
        ws.on('error', (err) => {
          this.warnings.push(`WebSocket connection failed: ${err.message}`);
          log.warning(`WebSocket connection failed: ${err.message}`);
          reject(err);
        });
        
        setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
      });
    } catch (error) {
      // WebSocket error already logged
    }
  }

  async checkSecurity() {
    log.header('Security Checks');
    
    // Check for console.log in production code
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      try {
        const files = this.getAllFiles(distPath, '.js');
        let consoleCount = 0;
        
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          const matches = content.match(/console\.(log|error|warn|info)/g);
          if (matches) {
            consoleCount += matches.length;
          }
        }
        
        if (consoleCount > 50) {
          this.warnings.push(`Found ${consoleCount} console statements in production code`);
          log.warning(`Found ${consoleCount} console statements in production code`);
        } else {
          log.success('Minimal console statements in production code');
        }
      } catch (error) {
        log.warning(`Could not check for console statements: ${error.message}`);
      }
    }
    
    // Check SSL/TLS
    if (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
      log.success('SSL certificate paths configured');
    } else {
      log.info('SSL not configured at application level (using reverse proxy is recommended)');
    }
    
    // Check CORS origins
    if (process.env.ALLOWED_ORIGINS) {
      const origins = process.env.ALLOWED_ORIGINS.split(',');
      if (origins.some(o => o === '*')) {
        this.errors.push('CORS allows all origins (*) - security risk!');
        log.error('CORS allows all origins (*) - security risk!');
      } else {
        log.success(`CORS restricted to ${origins.length} origin(s)`);
      }
    }
  }

  async checkPerformance() {
    log.header('Performance Configuration');
    
    // Check PM2 configuration
    const ecosystemPath = path.join(__dirname, '..', 'ecosystem.config.js');
    if (fs.existsSync(ecosystemPath)) {
      log.success('PM2 configuration exists');
      
      try {
        const config = require(ecosystemPath);
        if (config.apps && config.apps.length > 0) {
          const app = config.apps.find(a => a.name === 's4labs-backend');
          if (app) {
            if (app.instances === 'max' || app.instances > 1) {
              log.success('PM2 configured for clustering');
            } else {
              this.warnings.push('PM2 not using clustering');
              log.warning('PM2 not using clustering (single instance)');
            }
            
            if (app.max_memory_restart) {
              log.success(`Memory limit set to ${app.max_memory_restart}`);
            } else {
              this.warnings.push('No memory limit configured');
              log.warning('No memory limit configured in PM2');
            }
          }
        }
      } catch (error) {
        log.warning(`Could not parse PM2 config: ${error.message}`);
      }
    } else {
      this.warnings.push('PM2 configuration not found');
      log.warning('PM2 configuration not found');
    }
    
    // Check Node.js memory settings
    if (process.env.NODE_OPTIONS) {
      log.success(`NODE_OPTIONS set: ${process.env.NODE_OPTIONS}`);
    } else {
      log.info('NODE_OPTIONS not set (using defaults)');
    }
  }

  async checkLogs() {
    log.header('Logging Configuration');
    
    const logDir = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
    
    if (fs.existsSync(logDir)) {
      log.success(`Log directory exists: ${logDir}`);
      
      // Check if logs are being written
      const files = fs.readdirSync(logDir);
      if (files.length > 0) {
        log.success(`Found ${files.length} log file(s)`);
      } else {
        this.warnings.push('No log files found');
        log.warning('No log files found');
      }
    } else {
      this.warnings.push('Log directory does not exist');
      log.warning(`Log directory does not exist: ${logDir}`);
    }
    
    // Check log level
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel === 'debug' && process.env.NODE_ENV === 'production') {
      this.warnings.push('Debug logging enabled in production');
      log.warning('Debug logging enabled in production');
    } else {
      log.success(`Log level: ${logLevel}`);
    }
  }

  getAllFiles(dirPath, extension) {
    const files = [];
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extension));
      } else if (fullPath.endsWith(extension)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  printSummary() {
    log.header('Validation Summary');
    
    const total = this.errors.length + this.warnings.length;
    
    if (this.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bright}ERRORS (${this.errors.length})${colors.reset}`);
      this.errors.forEach(err => console.log(`  ${colors.red}• ${err}${colors.reset}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}WARNINGS (${this.warnings.length})${colors.reset}`);
      this.warnings.forEach(warn => console.log(`  ${colors.yellow}• ${warn}${colors.reset}`));
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.errors.length === 0) {
      console.log(`${colors.green}${colors.bright}✅ PRODUCTION READY${colors.reset}`);
      console.log(`${colors.green}All critical checks passed!${colors.reset}`);
      
      if (this.warnings.length > 0) {
        console.log(`${colors.yellow}${this.warnings.length} warning(s) should be reviewed${colors.reset}`);
      }
      
      process.exit(0);
    } else {
      console.log(`${colors.red}${colors.bright}❌ NOT PRODUCTION READY${colors.reset}`);
      console.log(`${colors.red}${this.errors.length} critical error(s) must be fixed${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run validation
const validator = new ProductionValidator();
validator.validate().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});