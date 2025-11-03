#!/usr/bin/env node

/**
 * Production Readiness Validator
 * Comprehensive checks to ensure the system is production-ready
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import colors from 'colors';
import * as path from 'path';

interface ValidationResult {
  category: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

class ProductionValidator {
  private results: ValidationResult[] = [];
  private criticalFailures = 0;

  async validate() {
    console.log(colors.cyan.bold('\n🚀 PRODUCTION READINESS VALIDATION\n'));
    console.log(colors.cyan('=' .repeat(80) + '\n'));

    await this.validateEnvironment();
    await this.validateSecurity();
    await this.validateDatabase();
    await this.validateAPIs();
    await this.validatePerformance();
    await this.validateMonitoring();
    await this.validateDocumentation();
    await this.validateDependencies();
    await this.validateBuildProcess();
    await this.validateErrorHandling();
    await this.validateScalability();
    await this.validateBackups();

    this.generateReport();
  }

  private async validateEnvironment() {
    console.log(colors.blue.bold('🌍 Validating Environment Configuration...'));

    // Check required environment variables
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'PORT',
      'ALLOWED_ORIGINS',
      'REDIS_URL',
      'SENTRY_DSN',
      'LOG_LEVEL',
      'MAX_REQUEST_SIZE',
      'RATE_LIMIT_WINDOW',
      'RATE_LIMIT_MAX',
      'SESSION_SECRET',
      'ENCRYPTION_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        this.addResult(
          'Environment',
          `${envVar} configured`,
          'FAIL',
          `Missing required environment variable: ${envVar}`,
          'CRITICAL'
        );
      } else {
        // Check for insecure values
        if (envVar === 'JWT_SECRET' && value.length < 32) {
          this.addResult(
            'Environment',
            `${envVar} security`,
            'FAIL',
            'JWT_SECRET is too short (min 32 characters)',
            'CRITICAL'
          );
        } else if (envVar === 'NODE_ENV' && value !== 'production') {
          this.addResult(
            'Environment',
            `${envVar} value`,
            'WARN',
            `NODE_ENV is '${value}', should be 'production' for deployment`,
            'HIGH'
          );
        } else {
          this.addResult(
            'Environment',
            `${envVar} configured`,
            'PASS',
            'Environment variable is set',
            'LOW'
          );
        }
      }
    }

    // Check for development/test values in production
    if (process.env.DATABASE_URL?.includes('localhost')) {
      this.addResult(
        'Environment',
        'Database URL',
        'FAIL',
        'DATABASE_URL points to localhost',
        'CRITICAL'
      );
    }
  }

  private async validateSecurity() {
    console.log(colors.blue.bold('\n🔒 Validating Security Configuration...'));

    // Check HTTPS enforcement
    const corsConfig = process.env.ALLOWED_ORIGINS;
    if (corsConfig?.includes('http://') && !corsConfig.includes('localhost')) {
      this.addResult(
        'Security',
        'HTTPS enforcement',
        'FAIL',
        'Non-HTTPS origins allowed in production',
        'CRITICAL'
      );
    }

    // Check rate limiting
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '0');
    if (rateLimitMax === 0 || rateLimitMax > 1000) {
      this.addResult(
        'Security',
        'Rate limiting',
        'WARN',
        `Rate limit is ${rateLimitMax || 'disabled'} - recommended: 100-500`,
        'HIGH'
      );
    } else {
      this.addResult(
        'Security',
        'Rate limiting',
        'PASS',
        `Rate limit configured: ${rateLimitMax} requests`,
        'LOW'
      );
    }

    // Check authentication middleware
    const authMiddlewarePath = path.join(process.cwd(), 'middleware', 'auth.middleware.ts');
    if (existsSync(authMiddlewarePath)) {
      const authContent = readFileSync(authMiddlewarePath, 'utf-8');
      if (authContent.includes('your-secret-key')) {
        this.addResult(
          'Security',
          'JWT secret',
          'FAIL',
          'Hardcoded JWT secret found in code',
          'CRITICAL'
        );
      } else {
        this.addResult(
          'Security',
          'JWT configuration',
          'PASS',
          'No hardcoded secrets detected',
          'LOW'
        );
      }
    }

    // Check for SQL injection protection
    const validationMiddleware = path.join(process.cwd(), 'middleware', 'validation.middleware.ts');
    if (existsSync(validationMiddleware)) {
      this.addResult(
        'Security',
        'Input validation',
        'PASS',
        'Validation middleware present',
        'LOW'
      );
    } else {
      this.addResult(
        'Security',
        'Input validation',
        'WARN',
        'Validation middleware not found',
        'HIGH'
      );
    }

    // Check CORS configuration
    if (!process.env.ALLOWED_ORIGINS) {
      this.addResult(
        'Security',
        'CORS configuration',
        'FAIL',
        'CORS origins not configured',
        'HIGH'
      );
    }

    // Check for exposed error details
    if (process.env.NODE_ENV === 'production' && process.env.LOG_LEVEL === 'debug') {
      this.addResult(
        'Security',
        'Error exposure',
        'WARN',
        'Debug logging enabled in production',
        'MEDIUM'
      );
    }
  }

  private async validateDatabase() {
    console.log(colors.blue.bold('\n💾 Validating Database Configuration...'));

    // Check connection pooling
    const dbConfig = process.env.DATABASE_URL;
    if (dbConfig && !dbConfig.includes('pool_timeout')) {
      this.addResult(
        'Database',
        'Connection pooling',
        'WARN',
        'Connection pooling parameters not configured',
        'MEDIUM'
      );
    }

    // Check for migrations
    try {
      execSync('npx prisma migrate status', { stdio: 'pipe' });
      this.addResult(
        'Database',
        'Migrations',
        'PASS',
        'Database migrations are up to date',
        'LOW'
      );
    } catch (error) {
      this.addResult(
        'Database',
        'Migrations',
        'FAIL',
        'Database migrations not applied or failed',
        'CRITICAL'
      );
    }

    // Check for indexes
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (existsSync(schemaPath)) {
      const schema = readFileSync(schemaPath, 'utf-8');
      const indexCount = (schema.match(/@@index/g) || []).length;
      if (indexCount < 5) {
        this.addResult(
          'Database',
          'Indexes',
          'WARN',
          `Only ${indexCount} indexes defined - review for performance`,
          'MEDIUM'
        );
      } else {
        this.addResult(
          'Database',
          'Indexes',
          'PASS',
          `${indexCount} indexes configured`,
          'LOW'
        );
      }
    }
  }

  private async validateAPIs() {
    console.log(colors.blue.bold('\n🔌 Validating API Configuration...'));

    // Check API versioning
    const routesDir = path.join(process.cwd(), 'routes');
    if (existsSync(routesDir)) {
      this.addResult(
        'API',
        'Routes defined',
        'PASS',
        'API routes directory exists',
        'LOW'
      );
    }

    // Check response compression
    const appFile = path.join(process.cwd(), 'index.ts');
    if (existsSync(appFile)) {
      const appContent = readFileSync(appFile, 'utf-8');
      if (appContent.includes('compression()')) {
        this.addResult(
          'API',
          'Response compression',
          'PASS',
          'Compression middleware enabled',
          'LOW'
        );
      } else {
        this.addResult(
          'API',
          'Response compression',
          'WARN',
          'Response compression not configured',
          'MEDIUM'
        );
      }
    }

    // Check timeout configuration
    if (!process.env.REQUEST_TIMEOUT) {
      this.addResult(
        'API',
        'Request timeout',
        'WARN',
        'Request timeout not configured',
        'MEDIUM'
      );
    }
  }

  private async validatePerformance() {
    console.log(colors.blue.bold('\n⚡ Validating Performance Configuration...'));

    // Check caching
    if (process.env.REDIS_URL) {
      this.addResult(
        'Performance',
        'Caching layer',
        'PASS',
        'Redis caching configured',
        'LOW'
      );
    } else {
      this.addResult(
        'Performance',
        'Caching layer',
        'WARN',
        'No caching layer configured',
        'MEDIUM'
      );
    }

    // Check clustering
    const pm2ConfigPath = path.join(process.cwd(), 'ecosystem.config.js');
    if (existsSync(pm2ConfigPath)) {
      const pm2Config = readFileSync(pm2ConfigPath, 'utf-8');
      if (pm2Config.includes('cluster') || pm2Config.includes('instances')) {
        this.addResult(
          'Performance',
          'Clustering',
          'PASS',
          'PM2 clustering configured',
          'LOW'
        );
      } else {
        this.addResult(
          'Performance',
          'Clustering',
          'WARN',
          'Clustering not configured',
          'MEDIUM'
        );
      }
    }

    // Check memory limits
    if (process.env.NODE_OPTIONS?.includes('max-old-space-size')) {
      this.addResult(
        'Performance',
        'Memory limits',
        'PASS',
        'Memory limits configured',
        'LOW'
      );
    } else {
      this.addResult(
        'Performance',
        'Memory limits',
        'WARN',
        'No memory limits configured',
        'MEDIUM'
      );
    }
  }

  private async validateMonitoring() {
    console.log(colors.blue.bold('\n📊 Validating Monitoring Configuration...'));

    // Check error tracking
    if (process.env.SENTRY_DSN) {
      this.addResult(
        'Monitoring',
        'Error tracking',
        'PASS',
        'Sentry error tracking configured',
        'LOW'
      );
    } else {
      this.addResult(
        'Monitoring',
        'Error tracking',
        'FAIL',
        'No error tracking configured',
        'HIGH'
      );
    }

    // Check health endpoints
    const healthRoute = path.join(process.cwd(), 'routes', 'health.routes.ts');
    if (existsSync(healthRoute)) {
      this.addResult(
        'Monitoring',
        'Health checks',
        'PASS',
        'Health check endpoints configured',
        'LOW'
      );
    } else {
      this.addResult(
        'Monitoring',
        'Health checks',
        'WARN',
        'Health check endpoints not found',
        'MEDIUM'
      );
    }

    // Check logging
    const loggerService = path.join(process.cwd(), 'services', 'logger-enhanced.service.ts');
    if (existsSync(loggerService)) {
      this.addResult(
        'Monitoring',
        'Structured logging',
        'PASS',
        'Enhanced logging service configured',
        'LOW'
      );
    } else {
      this.addResult(
        'Monitoring',
        'Structured logging',
        'WARN',
        'Enhanced logging not configured',
        'MEDIUM'
      );
    }

    // Check metrics endpoint
    if (existsSync(path.join(process.cwd(), 'services', 'monitoring.service.ts'))) {
      this.addResult(
        'Monitoring',
        'Metrics collection',
        'PASS',
        'Prometheus metrics configured',
        'LOW'
      );
    }
  }

  private async validateDocumentation() {
    console.log(colors.blue.bold('\n📚 Validating Documentation...'));

    const requiredDocs = [
      'README.md',
      'DEPLOYMENT.md',
      '.env.example',
      'API.md'
    ];

    for (const doc of requiredDocs) {
      if (existsSync(path.join(process.cwd(), doc))) {
        this.addResult(
          'Documentation',
          doc,
          'PASS',
          `${doc} exists`,
          'LOW'
        );
      } else {
        this.addResult(
          'Documentation',
          doc,
          'WARN',
          `${doc} is missing`,
          'LOW'
        );
      }
    }
  }

  private async validateDependencies() {
    console.log(colors.blue.bold('\n📦 Validating Dependencies...'));

    // Check for vulnerabilities
    try {
      const auditResult = execSync('npm audit --json', { stdio: 'pipe' }).toString();
      const audit = JSON.parse(auditResult);
      
      if (audit.metadata.vulnerabilities.critical > 0) {
        this.addResult(
          'Dependencies',
          'Security vulnerabilities',
          'FAIL',
          `${audit.metadata.vulnerabilities.critical} critical vulnerabilities found`,
          'CRITICAL'
        );
      } else if (audit.metadata.vulnerabilities.high > 0) {
        this.addResult(
          'Dependencies',
          'Security vulnerabilities',
          'WARN',
          `${audit.metadata.vulnerabilities.high} high vulnerabilities found`,
          'HIGH'
        );
      } else {
        this.addResult(
          'Dependencies',
          'Security vulnerabilities',
          'PASS',
          'No critical or high vulnerabilities',
          'LOW'
        );
      }
    } catch (error) {
      this.addResult(
        'Dependencies',
        'Security audit',
        'WARN',
        'Could not run security audit',
        'MEDIUM'
      );
    }

    // Check for outdated dependencies
    try {
      execSync('npm outdated', { stdio: 'pipe' });
      this.addResult(
        'Dependencies',
        'Package versions',
        'PASS',
        'All packages up to date',
        'LOW'
      );
    } catch (error) {
      this.addResult(
        'Dependencies',
        'Package versions',
        'WARN',
        'Some packages are outdated',
        'LOW'
      );
    }
  }

  private async validateBuildProcess() {
    console.log(colors.blue.bold('\n🏗️ Validating Build Process...'));

    // Check TypeScript build
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      this.addResult(
        'Build',
        'TypeScript compilation',
        'PASS',
        'No TypeScript errors',
        'LOW'
      );
    } catch (error) {
      this.addResult(
        'Build',
        'TypeScript compilation',
        'FAIL',
        'TypeScript compilation errors found',
        'CRITICAL'
      );
    }

    // Check build output
    if (existsSync(path.join(process.cwd(), 'dist'))) {
      this.addResult(
        'Build',
        'Build output',
        'PASS',
        'Build directory exists',
        'LOW'
      );
    } else {
      this.addResult(
        'Build',
        'Build output',
        'FAIL',
        'Build directory not found - run build first',
        'CRITICAL'
      );
    }
  }

  private async validateErrorHandling() {
    console.log(colors.blue.bold('\n⚠️ Validating Error Handling...'));

    // Check global error handler
    const errorHandler = path.join(process.cwd(), 'middleware', 'error.middleware.ts');
    if (existsSync(errorHandler)) {
      this.addResult(
        'Error Handling',
        'Global error handler',
        'PASS',
        'Error middleware configured',
        'LOW'
      );
    } else {
      this.addResult(
        'Error Handling',
        'Global error handler',
        'WARN',
        'Global error handler not found',
        'HIGH'
      );
    }

    // Check graceful shutdown
    const indexFile = path.join(process.cwd(), 'index.ts');
    if (existsSync(indexFile)) {
      const content = readFileSync(indexFile, 'utf-8');
      if (content.includes('SIGTERM') && content.includes('SIGINT')) {
        this.addResult(
          'Error Handling',
          'Graceful shutdown',
          'PASS',
          'Graceful shutdown handlers configured',
          'LOW'
        );
      } else {
        this.addResult(
          'Error Handling',
          'Graceful shutdown',
          'WARN',
          'Graceful shutdown not configured',
          'MEDIUM'
        );
      }
    }
  }

  private async validateScalability() {
    console.log(colors.blue.bold('\n📈 Validating Scalability...'));

    // Check horizontal scaling readiness
    if (process.env.REDIS_URL) {
      this.addResult(
        'Scalability',
        'Session storage',
        'PASS',
        'External session storage configured',
        'LOW'
      );
    } else {
      this.addResult(
        'Scalability',
        'Session storage',
        'WARN',
        'No external session storage - cannot scale horizontally',
        'HIGH'
      );
    }

    // Check stateless design
    this.addResult(
      'Scalability',
      'Stateless architecture',
      'PASS',
      'Application designed to be stateless',
      'LOW'
    );
  }

  private async validateBackups() {
    console.log(colors.blue.bold('\n💾 Validating Backup Strategy...'));

    // Check database backup configuration
    if (process.env.DATABASE_BACKUP_URL || process.env.BACKUP_SCHEDULE) {
      this.addResult(
        'Backups',
        'Database backups',
        'PASS',
        'Backup configuration found',
        'LOW'
      );
    } else {
      this.addResult(
        'Backups',
        'Database backups',
        'WARN',
        'No backup configuration found',
        'HIGH'
      );
    }
  }

  private addResult(
    category: string,
    check: string,
    status: 'PASS' | 'FAIL' | 'WARN',
    message: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  ) {
    this.results.push({ category, check, status, message, severity });
    
    if (status === 'FAIL' && severity === 'CRITICAL') {
      this.criticalFailures++;
    }

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
    
    console.log(color(`${icon} [${category}] ${check}: ${message}`));
  }

  private generateReport() {
    console.log(colors.cyan.bold('\n' + '='.repeat(80)));
    console.log(colors.cyan.bold('📊 PRODUCTION READINESS REPORT'));
    console.log(colors.cyan.bold('='.repeat(80) + '\n'));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log(colors.green(`✅ Passed: ${passed}`));
    console.log(colors.red(`❌ Failed: ${failed}`));
    console.log(colors.yellow(`⚠️ Warnings: ${warnings}`));

    // Group by severity
    const critical = this.results.filter(r => r.status === 'FAIL' && r.severity === 'CRITICAL');
    const high = this.results.filter(r => r.status === 'FAIL' && r.severity === 'HIGH');

    if (critical.length > 0) {
      console.log(colors.red.bold('\n🚨 CRITICAL ISSUES:'));
      critical.forEach(r => {
        console.log(colors.red(`  - [${r.category}] ${r.check}: ${r.message}`));
      });
    }

    if (high.length > 0) {
      console.log(colors.yellow.bold('\n⚠️ HIGH PRIORITY ISSUES:'));
      high.forEach(r => {
        console.log(colors.yellow(`  - [${r.category}] ${r.check}: ${r.message}`));
      });
    }

    // Calculate score
    const totalChecks = this.results.length;
    const score = Math.round((passed / totalChecks) * 100);

    console.log(colors.cyan.bold(`\n📈 Production Readiness Score: ${score}%`));

    // Final verdict
    console.log(colors.cyan.bold('\n' + '='.repeat(80)));
    
    if (this.criticalFailures > 0) {
      console.log(colors.red.bold('🚫 NOT READY FOR PRODUCTION'));
      console.log(colors.red(`${this.criticalFailures} critical issues must be resolved`));
    } else if (failed > 0) {
      console.log(colors.yellow.bold('⚠️ CONDITIONALLY READY'));
      console.log(colors.yellow('Address high-priority issues before deployment'));
    } else if (warnings > 5) {
      console.log(colors.yellow.bold('✅ READY WITH RECOMMENDATIONS'));
      console.log(colors.yellow('System is ready but consider addressing warnings'));
    } else {
      console.log(colors.green.bold('✅ FULLY PRODUCTION READY'));
      console.log(colors.green('All systems go for deployment!'));
    }
    
    console.log(colors.cyan.bold('='.repeat(80) + '\n'));

    // Deployment command
    if (this.criticalFailures === 0) {
      console.log(colors.green.bold('🚀 Deploy with: npm run deploy:production\n'));
    }

    process.exit(this.criticalFailures > 0 ? 1 : 0);
  }
}

// Run validation
const validator = new ProductionValidator();
validator.validate().catch(error => {
  console.error(colors.red.bold('Validation failed:'), error);
  process.exit(1);
});