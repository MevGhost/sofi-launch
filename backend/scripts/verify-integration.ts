import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// DevBondingCurve ABI
const DevBondingCurveABI = require('../abis/DevBondingCurve.json');

async function verifyIntegration() {
  console.log('🔍 Verifying Full Stack Integration');
  console.log('====================================\n');

  const results = {
    backend: { passed: 0, failed: 0 },
    frontend: { passed: 0, failed: 0 },
    contract: { passed: 0, failed: 0 },
  };

  try {
    // 1. Verify Backend Configuration
    console.log('1. Backend Configuration');
    console.log('------------------------');
    
    // Check environment variables
    const requiredBackendVars = [
      'DEV_BONDING_FACTORY_ADDRESS',
      'TOKEN_FACTORY_ADDRESS',
      'BASE_SEPOLIA_RPC_URL',
      'DATABASE_URL',
      'PORT'
    ];

    for (const varName of requiredBackendVars) {
      if (process.env[varName]) {
        console.log(`✅ ${varName}: ${varName.includes('KEY') || varName.includes('PRIVATE') ? '***' : process.env[varName]}`);
        results.backend.passed++;
      } else {
        console.log(`❌ ${varName}: Not set`);
        results.backend.failed++;
      }
    }

    // Check if DEV_BONDING_FACTORY_ADDRESS matches expected
    if (process.env['DEV_BONDING_FACTORY_ADDRESS'] === '0xD120242C95B2334981B45e230900Cac115eF3f49') {
      console.log('✅ DEV_BONDING_FACTORY_ADDRESS points to correct DevBondingCurve');
      results.backend.passed++;
    } else {
      console.log('❌ DEV_BONDING_FACTORY_ADDRESS mismatch');
      results.backend.failed++;
    }

    // 2. Verify Contract on Chain
    console.log('\n2. Smart Contract Verification');
    console.log('-------------------------------');

    const provider = new ethers.JsonRpcProvider(
      process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0'
    );
    
    const contractAddress = '0xD120242C95B2334981B45e230900Cac115eF3f49';
    const contract = new ethers.Contract(contractAddress, DevBondingCurveABI, provider);

    // Check contract deployment
    const code = await provider.getCode(contractAddress);
    if (code !== '0x') {
      console.log('✅ DevBondingCurve deployed at:', contractAddress);
      results.contract.passed++;
    } else {
      console.log('❌ Contract not found at address');
      results.contract.failed++;
    }

    // Check contract functions
    try {
      const creationFee = await contract.CREATION_FEE();
      console.log(`✅ Creation Fee: ${ethers.formatEther(creationFee)} ETH`);
      results.contract.passed++;
    } catch {
      console.log('❌ Failed to read CREATION_FEE');
      results.contract.failed++;
    }

    try {
      const tokenCount = await contract.getTokenCount();
      console.log(`✅ Token Count: ${tokenCount.toString()}`);
      results.contract.passed++;
    } catch {
      console.log('❌ Failed to read token count');
      results.contract.failed++;
    }

    // 3. Verify Frontend Configuration
    console.log('\n3. Frontend Configuration');
    console.log('-------------------------');

    // Read frontend .env.local
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../../.env.local');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      
      if (envContent.includes('NEXT_PUBLIC_DEV_BONDING_FACTORY_ADDRESS=0xD120242C95B2334981B45e230900Cac115eF3f49')) {
        console.log('✅ Frontend .env.local has correct DEV_BONDING_FACTORY_ADDRESS');
        results.frontend.passed++;
      } else {
        console.log('❌ Frontend .env.local missing correct DEV_BONDING_FACTORY_ADDRESS');
        results.frontend.failed++;
      }

      if (envContent.includes('NEXT_PUBLIC_API_URL=http://localhost:5001')) {
        console.log('✅ Frontend configured to connect to backend on port 5001');
        results.frontend.passed++;
      } else {
        console.log('❌ Frontend API_URL misconfigured');
        results.frontend.failed++;
      }
    } else {
      console.log('❌ Frontend .env.local not found');
      results.frontend.failed += 2;
    }

    // Check if frontend config exports DevBondingCurve ABI
    const configPath = path.join(__dirname, '../../src/contracts/config.ts');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      
      if (configContent.includes('DevBondingCurveABI')) {
        console.log('✅ Frontend contracts/config.ts includes DevBondingCurve ABI');
        results.frontend.passed++;
      } else {
        console.log('❌ Frontend contracts/config.ts missing DevBondingCurve ABI');
        results.frontend.failed++;
      }

      if (configContent.includes('devBondingFactory')) {
        console.log('✅ Frontend contracts/config.ts includes devBondingFactory address');
        results.frontend.passed++;
      } else {
        console.log('❌ Frontend contracts/config.ts missing devBondingFactory');
        results.frontend.failed++;
      }
    }

    // 4. Check Critical Files
    console.log('\n4. Critical File Updates');
    console.log('------------------------');

    const filesToCheck = [
      { path: '/backend/services/contract.service.ts', pattern: 'DevBondingCurveABI', name: 'Backend contract service' },
      { path: '/backend/services/event-listener.service.ts', pattern: 'DevBondingCurveABI', name: 'Backend event listener' },
      { path: '/src/hooks/useSimpleTokenDeploy.ts', pattern: 'devBondingFactory', name: 'Frontend deploy hook' },
      { path: '/src/hooks/useBondingCurve.ts', pattern: 'DEV_BONDING_FACTORY_ADDRESS', name: 'Frontend bonding curve hook' },
      { path: '/src/hooks/useCheckTokenLimits.ts', pattern: 'devBondingFactory', name: 'Frontend limits hook' },
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(__dirname, '../..', file.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes(file.pattern)) {
          console.log(`✅ ${file.name} updated`);
          results.backend.passed++;
        } else {
          console.log(`❌ ${file.name} not updated`);
          results.backend.failed++;
        }
      }
    }

    // 5. Summary
    console.log('\n📊 Integration Summary');
    console.log('======================');
    
    const total = {
      passed: results.backend.passed + results.frontend.passed + results.contract.passed,
      failed: results.backend.failed + results.frontend.failed + results.contract.failed
    };

    console.log(`Backend:  ${results.backend.passed} passed, ${results.backend.failed} failed`);
    console.log(`Frontend: ${results.frontend.passed} passed, ${results.frontend.failed} failed`);
    console.log(`Contract: ${results.contract.passed} passed, ${results.contract.failed} failed`);
    console.log(`-----------------------`);
    console.log(`Total:    ${total.passed} passed, ${total.failed} failed`);

    if (total.failed === 0) {
      console.log('\n✅ All integration checks passed!');
      console.log('The DevBondingCurve contract is fully integrated.');
      console.log('You can now create unlimited tokens without restrictions.');
    } else {
      console.log('\n⚠️ Some integration checks failed.');
      console.log('Please review the failures above and fix them.');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verifyIntegration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { verifyIntegration };