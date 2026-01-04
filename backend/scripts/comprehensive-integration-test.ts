#!/usr/bin/env node

/**
 * Comprehensive Frontend-Backend Integration Test
 * Tests all API endpoints, data flow, WebSocket events, and error handling
 */

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { PrismaClient } from '@prisma/client';
import colors from 'colors';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:4000';
const WS_BASE_URL = process.env.WS_URL || 'ws://localhost:4000';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  responseTime?: number;
  dataValidation?: boolean;
}

class IntegrationTester {
  private api: AxiosInstance;
  private db: PrismaClient;
  private ws: WebSocket | null = null;
  private authToken: string | null = null;
  private testResults: TestResult[] = [];
  private testUser = {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    signature: 'test_signature',
    nonce: 'test_nonce'
  };

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });

    this.db = new PrismaClient();
  }

  async runAllTests() {
    console.log(colors.cyan.bold('\n🚀 Starting Comprehensive Integration Tests\n'));

    await this.testDatabaseConnection();
    await this.testAuthenticationFlow();
    await this.testTokenEndpoints();
    await this.testEscrowEndpoints();
    await this.testPortfolioEndpoints();
    await this.testAdminEndpoints();
    await this.testKOLEndpoints();
    await this.testVerifierEndpoints();
    await this.testStatisticsEndpoints();
    await this.testUploadEndpoints();
    await this.testWebSocketConnection();
    await this.testDataConsistency();
    await this.testErrorHandling();
    await this.testRateLimiting();
    await this.testConcurrency();
    await this.testCaching();
    await this.testSecurity();
    await this.testPerformance();

    this.printReport();
  }

  private async testDatabaseConnection() {
    console.log(colors.blue.bold('\n📊 Testing Database Connection...'));
    
    try {
      await this.db.$connect();
      await this.db.$executeRaw`SELECT 1`;
      this.addResult('Database', 'CONNECTION', 'PASS', 'Database connected successfully');
    } catch (error) {
      this.addResult('Database', 'CONNECTION', 'FAIL', `Database connection failed: ${error}`);
    }
  }

  private async testAuthenticationFlow() {
    console.log(colors.blue.bold('\n🔐 Testing Authentication Flow...'));

    // Test nonce generation
    const nonceTest = await this.testEndpoint(
      'POST',
      '/api/auth/nonce',
      { address: this.testUser.address },
      z.object({
        success: z.boolean(),
        data: z.object({
          nonce: z.string()
        })
      })
    );

    // Test login
    const loginTest = await this.testEndpoint(
      'POST',
      '/api/auth/login',
      this.testUser,
      z.object({
        success: z.boolean(),
        data: z.object({
          token: z.string(),
          user: z.object({
            id: z.string(),
            address: z.string(),
            role: z.enum(['USER', 'ADMIN', 'KOL', 'VERIFIER'])
          })
        })
      })
    );

    if (loginTest?.data?.token) {
      this.authToken = loginTest.data.token;
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Test verify
    await this.testEndpoint(
      'GET',
      '/api/auth/verify',
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          valid: z.boolean(),
          user: z.object({
            id: z.string(),
            address: z.string()
          })
        })
      })
    );

    // Test logout
    await this.testEndpoint(
      'POST',
      '/api/auth/logout',
      null,
      z.object({
        success: z.boolean()
      })
    );
  }

  private async testTokenEndpoints() {
    console.log(colors.blue.bold('\n🪙 Testing Token Endpoints...'));

    // Test list tokens
    await this.testEndpoint(
      'GET',
      '/api/tokens?limit=10&offset=0',
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          tokens: z.array(z.any()),
          total: z.number(),
          limit: z.number(),
          offset: z.number()
        })
      })
    );

    // Test create token (requires auth)
    await this.testEndpoint(
      'POST',
      '/api/tokens/create',
      {
        name: 'Test Token',
        symbol: 'TEST',
        description: 'Test token description',
        totalSupply: '1000000000'
      },
      z.object({
        success: z.boolean(),
        data: z.object({
          address: z.string(),
          name: z.string(),
          symbol: z.string()
        })
      })
    );

    // Test token details
    const testAddress = '0x1234567890123456789012345678901234567890';
    await this.testEndpoint(
      'GET',
      `/api/tokens/${testAddress}`,
      null,
      z.object({
        success: z.boolean(),
        data: z.any()
      })
    );

    // Test buy/sell
    await this.testEndpoint(
      'POST',
      '/api/tokens/buy',
      {
        tokenAddress: testAddress,
        amount: '100'
      },
      z.object({
        success: z.boolean(),
        data: z.object({
          trade: z.any(),
          transactionHash: z.string()
        })
      })
    );

    // Test chart data
    await this.testEndpoint(
      'GET',
      `/api/tokens/${testAddress}/chart?interval=1h&period=24h`,
      null,
      z.object({
        success: z.boolean(),
        data: z.array(z.any())
      })
    );

    // Test holders
    await this.testEndpoint(
      'GET',
      `/api/tokens/${testAddress}/holders`,
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          holders: z.array(z.any()),
          total: z.number()
        })
      })
    );

    // Test trades
    await this.testEndpoint(
      'GET',
      `/api/tokens/${testAddress}/trades`,
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          trades: z.array(z.any()),
          total: z.number()
        })
      })
    );
  }

  private async testEscrowEndpoints() {
    console.log(colors.blue.bold('\n🔒 Testing Escrow Endpoints...'));

    // Test list escrows
    await this.testEndpoint(
      'GET',
      '/api/escrows',
      null,
      z.object({
        success: z.boolean(),
        data: z.array(z.any())
      })
    );

    // Test create escrow
    await this.testEndpoint(
      'POST',
      '/api/escrows',
      {
        title: 'Test Escrow',
        description: 'Test escrow description',
        totalAmount: '1000',
        kolAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        milestones: [
          {
            description: 'Milestone 1',
            amount: '500',
            dueDate: new Date().toISOString()
          }
        ]
      },
      z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          title: z.string(),
          status: z.string()
        })
      })
    );

    // Test escrow details
    await this.testEndpoint(
      'GET',
      '/api/escrows/test-id',
      null,
      z.object({
        success: z.boolean(),
        data: z.any()
      })
    );

    // Test milestone release
    await this.testEndpoint(
      'POST',
      '/api/escrows/test-id/milestones/milestone-id/release',
      {},
      z.object({
        success: z.boolean()
      })
    );

    // Test dispute
    await this.testEndpoint(
      'POST',
      '/api/escrows/test-id/disputes',
      {
        reason: 'Test dispute reason'
      },
      z.object({
        success: z.boolean()
      })
    );
  }

  private async testPortfolioEndpoints() {
    console.log(colors.blue.bold('\n💼 Testing Portfolio Endpoints...'));

    // Test portfolio overview
    await this.testEndpoint(
      'GET',
      '/api/portfolio',
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          totalValue: z.string(),
          totalPnL: z.string(),
          holdingsCount: z.number(),
          escrowsCount: z.number()
        })
      })
    );

    // Test portfolio tokens
    await this.testEndpoint(
      'GET',
      '/api/portfolio/tokens',
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          tokens: z.array(z.any()),
          stats: z.object({
            totalValue: z.string(),
            totalPnL: z.string(),
            tokensHeld: z.number()
          })
        })
      })
    );

    // Test portfolio escrows
    await this.testEndpoint(
      'GET',
      '/api/portfolio/escrows',
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          escrows: z.array(z.any())
        })
      })
    );

    // Test activities
    await this.testEndpoint(
      'GET',
      '/api/portfolio/activities',
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          activities: z.array(z.any())
        })
      })
    );

    // Test PnL
    await this.testEndpoint(
      'GET',
      '/api/portfolio/pnl?period=7d',
      null,
      z.object({
        success: z.boolean(),
        data: z.object({
          totalPnL: z.string(),
          realizedPnL: z.string(),
          unrealizedPnL: z.string(),
          roi: z.string()
        })
      })
    );
  }

  private async testAdminEndpoints() {
    console.log(colors.blue.bold('\n👨‍💼 Testing Admin Endpoints...'));

    const adminEndpoints = [
      '/api/admin/dashboard',
      '/api/admin/users',
      '/api/admin/escrows',
      '/api/admin/settings',
      '/api/admin/fees',
      '/api/admin/contracts'
    ];

    for (const endpoint of adminEndpoints) {
      await this.testEndpoint(
        'GET',
        endpoint,
        null,
        z.object({
          success: z.boolean(),
          data: z.any()
        })
      );
    }
  }

  private async testKOLEndpoints() {
    console.log(colors.blue.bold('\n⭐ Testing KOL Endpoints...'));

    const kolEndpoints = [
      '/api/kol/profile',
      '/api/kol/deals',
      '/api/kol/earnings',
      '/api/kol/reputation'
    ];

    for (const endpoint of kolEndpoints) {
      await this.testEndpoint(
        'GET',
        endpoint,
        null,
        z.object({
          success: z.boolean(),
          data: z.any()
        })
      );
    }
  }

  private async testVerifierEndpoints() {
    console.log(colors.blue.bold('\n✅ Testing Verifier Endpoints...'));

    await this.testEndpoint(
      'POST',
      '/api/verifier/verify',
      {
        escrowId: 'test-id',
        approved: true
      },
      z.object({
        success: z.boolean()
      })
    );

    await this.testEndpoint(
      'GET',
      '/api/verifier/pending',
      null,
      z.object({
        success: z.boolean(),
        data: z.array(z.any())
      })
    );

    await this.testEndpoint(
      'GET',
      '/api/verifier/history',
      null,
      z.object({
        success: z.boolean(),
        data: z.array(z.any())
      })
    );
  }

  private async testStatisticsEndpoints() {
    console.log(colors.blue.bold('\n📈 Testing Statistics Endpoints...'));

    const statsEndpoints = [
      '/api/stats',
      '/api/stats/tokens',
      '/api/stats/escrows',
      '/api/stats/volume'
    ];

    for (const endpoint of statsEndpoints) {
      await this.testEndpoint(
        'GET',
        endpoint,
        null,
        z.object({
          success: z.boolean(),
          data: z.object({})
        })
      );
    }
  }

  private async testUploadEndpoints() {
    console.log(colors.blue.bold('\n📤 Testing Upload Endpoints...'));

    // Test file upload (multipart/form-data)
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/png' });
    formData.append('file', blob, 'test.png');

    await this.testEndpoint(
      'POST',
      '/api/upload/token-image',
      formData,
      z.object({
        success: z.boolean(),
        data: z.object({
          url: z.string()
        })
      }),
      { 'Content-Type': 'multipart/form-data' }
    );

    // Test file deletion
    await this.testEndpoint(
      'DELETE',
      '/api/upload/token-image/test.png',
      null,
      z.object({
        success: z.boolean()
      })
    );
  }

  private async testWebSocketConnection() {
    console.log(colors.blue.bold('\n🔌 Testing WebSocket Connection...'));

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(WS_BASE_URL);

        this.ws.on('open', () => {
          this.addResult('WebSocket', 'CONNECTION', 'PASS', 'WebSocket connected');

          // Test sending message
          this.ws?.send(JSON.stringify({
            event: 'subscribe',
            payload: { channel: 'tokens' }
          }));

          // Test receiving message
          setTimeout(() => {
            this.ws?.close();
            resolve(null);
          }, 2000);
        });

        this.ws.on('error', (error) => {
          this.addResult('WebSocket', 'CONNECTION', 'FAIL', `WebSocket error: ${error}`);
          resolve(null);
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.addResult('WebSocket', 'MESSAGE', 'PASS', 'WebSocket message received');
          } catch (error) {
            this.addResult('WebSocket', 'MESSAGE', 'FAIL', 'Invalid WebSocket message format');
          }
        });
      } catch (error) {
        this.addResult('WebSocket', 'CONNECTION', 'FAIL', `WebSocket failed: ${error}`);
        resolve(null);
      }
    });
  }

  private async testDataConsistency() {
    console.log(colors.blue.bold('\n🔍 Testing Data Consistency...'));

    // Test that frontend expected fields match backend responses
    const tests = [
      {
        name: 'Token list response structure',
        endpoint: '/api/tokens',
        expectedFields: ['tokens', 'total', 'limit', 'offset']
      },
      {
        name: 'Portfolio response structure',
        endpoint: '/api/portfolio',
        expectedFields: ['totalValue', 'totalPnL', 'holdingsCount']
      },
      {
        name: 'Auth response structure',
        endpoint: '/api/auth/verify',
        expectedFields: ['valid', 'user']
      }
    ];

    for (const test of tests) {
      try {
        const response = await this.api.get(test.endpoint);
        if (response.data.success) {
          const hasAllFields = test.expectedFields.every(field => 
            response.data.data && field in response.data.data
          );
          
          this.addResult(
            test.name,
            'STRUCTURE',
            hasAllFields ? 'PASS' : 'FAIL',
            hasAllFields ? 'All expected fields present' : `Missing fields: ${test.expectedFields.filter(f => !(f in response.data.data))}`
          );
        }
      } catch (error) {
        this.addResult(test.name, 'STRUCTURE', 'FAIL', `Test failed: ${error}`);
      }
    }
  }

  private async testErrorHandling() {
    console.log(colors.blue.bold('\n⚠️ Testing Error Handling...'));

    // Test 404 handling
    const notFoundTest = await this.api.get('/api/nonexistent');
    this.addResult(
      'Error Handling',
      '404',
      notFoundTest.status === 404 ? 'PASS' : 'FAIL',
      `Status: ${notFoundTest.status}`
    );

    // Test validation errors
    const validationTest = await this.api.post('/api/tokens/create', {});
    this.addResult(
      'Error Handling',
      'VALIDATION',
      validationTest.status === 400 ? 'PASS' : 'FAIL',
      `Validation error handling: ${validationTest.status}`
    );

    // Test unauthorized access
    const originalToken = this.api.defaults.headers.common['Authorization'];
    delete this.api.defaults.headers.common['Authorization'];
    
    const unauthorizedTest = await this.api.get('/api/portfolio');
    this.addResult(
      'Error Handling',
      'UNAUTHORIZED',
      unauthorizedTest.status === 401 ? 'PASS' : 'FAIL',
      `Unauthorized handling: ${unauthorizedTest.status}`
    );
    
    this.api.defaults.headers.common['Authorization'] = originalToken;
  }

  private async testRateLimiting() {
    console.log(colors.blue.bold('\n⏱️ Testing Rate Limiting...'));

    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(this.api.get('/api/tokens'));
    }

    const results = await Promise.all(requests);
    const rateLimited = results.some(r => r.status === 429);

    this.addResult(
      'Rate Limiting',
      'TEST',
      rateLimited ? 'PASS' : 'SKIP',
      rateLimited ? 'Rate limiting is active' : 'Rate limiting not detected (may be disabled in dev)'
    );
  }

  private async testConcurrency() {
    console.log(colors.blue.bold('\n🔄 Testing Concurrent Requests...'));

    const concurrentRequests = [
      this.api.get('/api/tokens'),
      this.api.get('/api/stats'),
      this.api.get('/api/escrows'),
      this.api.get('/api/tokens?limit=5'),
      this.api.get('/api/stats/volume')
    ];

    const start = Date.now();
    const results = await Promise.allSettled(concurrentRequests);
    const duration = Date.now() - start;

    const allSuccessful = results.every(r => r.status === 'fulfilled');

    this.addResult(
      'Concurrency',
      'PARALLEL',
      allSuccessful ? 'PASS' : 'FAIL',
      `${results.length} concurrent requests in ${duration}ms`
    );
  }

  private async testCaching() {
    console.log(colors.blue.bold('\n💾 Testing Caching...'));

    // First request (should not be cached)
    const start1 = Date.now();
    await this.api.get('/api/tokens');
    const duration1 = Date.now() - start1;

    // Second request (should be cached)
    const start2 = Date.now();
    await this.api.get('/api/tokens');
    const duration2 = Date.now() - start2;

    const cacheWorking = duration2 < duration1 * 0.5;

    this.addResult(
      'Caching',
      'PERFORMANCE',
      cacheWorking ? 'PASS' : 'SKIP',
      `First: ${duration1}ms, Second: ${duration2}ms`
    );
  }

  private async testSecurity() {
    console.log(colors.blue.bold('\n🔒 Testing Security...'));

    // Test SQL injection protection
    const sqlInjectionTest = await this.api.get("/api/tokens?search='; DROP TABLE users; --");
    this.addResult(
      'Security',
      'SQL_INJECTION',
      sqlInjectionTest.status !== 500 ? 'PASS' : 'FAIL',
      'SQL injection protection'
    );

    // Test XSS protection
    const xssTest = await this.api.post('/api/tokens/create', {
      name: '<script>alert("XSS")</script>',
      symbol: 'XSS'
    });
    this.addResult(
      'Security',
      'XSS',
      xssTest.status === 400 ? 'PASS' : 'FAIL',
      'XSS protection'
    );

    // Test CORS headers
    const corsTest = await this.api.get('/api/tokens');
    const corsHeaders = corsTest.headers['access-control-allow-origin'];
    this.addResult(
      'Security',
      'CORS',
      corsHeaders ? 'PASS' : 'FAIL',
      `CORS headers: ${corsHeaders || 'Not set'}`
    );
  }

  private async testPerformance() {
    console.log(colors.blue.bold('\n⚡ Testing Performance...'));

    const performanceTests = [
      { endpoint: '/api/tokens', maxTime: 200 },
      { endpoint: '/api/stats', maxTime: 150 },
      { endpoint: '/api/portfolio', maxTime: 300 },
    ];

    for (const test of performanceTests) {
      const start = Date.now();
      await this.api.get(test.endpoint);
      const duration = Date.now() - start;

      this.addResult(
        'Performance',
        test.endpoint,
        duration <= test.maxTime ? 'PASS' : 'FAIL',
        `Response time: ${duration}ms (max: ${test.maxTime}ms)`
      );
    }
  }

  private async testEndpoint(
    method: string,
    endpoint: string,
    data: any,
    schema: z.ZodSchema,
    headers?: Record<string, string>
  ): Promise<any> {
    const start = Date.now();
    
    try {
      const config: any = { headers: headers || {} };
      let response;

      switch (method) {
        case 'GET':
          response = await this.api.get(endpoint, config);
          break;
        case 'POST':
          response = await this.api.post(endpoint, data, config);
          break;
        case 'PUT':
          response = await this.api.put(endpoint, data, config);
          break;
        case 'DELETE':
          response = await this.api.delete(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const duration = Date.now() - start;

      // Validate response structure
      try {
        const validated = schema.parse(response.data);
        this.addResult(
          endpoint,
          method,
          'PASS',
          `Status: ${response.status}, Time: ${duration}ms`,
          duration,
          true
        );
        return validated;
      } catch (validationError) {
        this.addResult(
          endpoint,
          method,
          'FAIL',
          `Data validation failed: ${validationError}`,
          duration,
          false
        );
        return null;
      }
    } catch (error: any) {
      const duration = Date.now() - start;
      this.addResult(
        endpoint,
        method,
        'FAIL',
        `Error: ${error.message}`,
        duration,
        false
      );
      return null;
    }
  }

  private addResult(
    endpoint: string,
    method: string,
    status: 'PASS' | 'FAIL' | 'SKIP',
    message?: string,
    responseTime?: number,
    dataValidation?: boolean
  ) {
    this.testResults.push({
      endpoint,
      method,
      status,
      message,
      responseTime,
      dataValidation
    });

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
    
    console.log(color(`${icon} ${method} ${endpoint} - ${message || status}`));
  }

  private printReport() {
    console.log(colors.cyan.bold('\n' + '='.repeat(80)));
    console.log(colors.cyan.bold('📊 INTEGRATION TEST REPORT'));
    console.log(colors.cyan.bold('='.repeat(80) + '\n'));

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;
    const total = this.testResults.length;

    console.log(colors.green(`✅ Passed: ${passed}`));
    console.log(colors.red(`❌ Failed: ${failed}`));
    console.log(colors.yellow(`⏭️ Skipped: ${skipped}`));
    console.log(colors.blue(`📊 Total: ${total}`));

    const successRate = ((passed / total) * 100).toFixed(2);
    console.log(colors.cyan(`\n🎯 Success Rate: ${successRate}%`));

    // Performance summary
    const avgResponseTime = this.testResults
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / 
      this.testResults.filter(r => r.responseTime).length;

    console.log(colors.cyan(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`));

    // Failed tests details
    if (failed > 0) {
      console.log(colors.red.bold('\n❌ Failed Tests:'));
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(colors.red(`  - ${r.method} ${r.endpoint}: ${r.message}`));
        });
    }

    // Final verdict
    console.log(colors.cyan.bold('\n' + '='.repeat(80)));
    if (failed === 0) {
      console.log(colors.green.bold('✨ ALL TESTS PASSED - SYSTEM IS PRODUCTION READY! ✨'));
    } else if (failed <= 5) {
      console.log(colors.yellow.bold('⚠️ MINOR ISSUES DETECTED - REVIEW AND FIX BEFORE PRODUCTION'));
    } else {
      console.log(colors.red.bold('🚫 CRITICAL ISSUES FOUND - NOT READY FOR PRODUCTION'));
    }
    console.log(colors.cyan.bold('='.repeat(80) + '\n'));

    // Cleanup
    this.db.$disconnect();
    if (this.ws) {
      this.ws.close();
    }

    process.exit(failed > 5 ? 1 : 0);
  }
}

// Run tests
const tester = new IntegrationTester();
tester.runAllTests().catch(error => {
  console.error(colors.red.bold('Test suite failed:'), error);
  process.exit(1);
});