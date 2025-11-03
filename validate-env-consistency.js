const fs = require('fs');
const path = require('path');

// Read environment files
const frontendEnv = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const backendEnv = fs.readFileSync(path.join(__dirname, 'backend', '.env'), 'utf8');

// Parse environment variables
function parseEnv(content) {
  const vars = {};
  content.split('\n').forEach(line => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      vars[key.trim()] = valueParts.join('=').trim();
    }
  });
  return vars;
}

const frontendVars = parseEnv(frontendEnv);
const backendVars = parseEnv(backendEnv);

console.log('🔍 Environment Variables Consistency Check\n');
console.log('=' .repeat(60));

// Check matching values
const checks = [
  {
    frontend: 'NEXT_PUBLIC_CHAIN_ID',
    backend: 'CHAIN_ID',
    description: 'Chain ID'
  },
  {
    frontend: 'NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS',
    backend: 'ESCROW_FACTORY_ADDRESS',
    description: 'Escrow Factory Address'
  },
  {
    frontend: 'NEXT_PUBLIC_API_URL',
    value: 'http://localhost:4000',
    description: 'API URL'
  },
  {
    frontend: 'NEXT_PUBLIC_WS_URL',
    value: 'ws://localhost:4000',
    description: 'WebSocket URL'
  }
];

let allPassed = true;

checks.forEach(check => {
  const frontendValue = frontendVars[check.frontend];
  const backendValue = check.backend ? backendVars[check.backend] : check.value;
  const expectedValue = check.value || backendValue;
  
  const match = frontendValue === expectedValue;
  const status = match ? '✅' : '❌';
  
  console.log(`${status} ${check.description}:`);
  console.log(`   Frontend: ${frontendValue || 'NOT SET'}`);
  if (check.backend) {
    console.log(`   Backend:  ${backendValue || 'NOT SET'}`);
  } else {
    console.log(`   Expected: ${expectedValue}`);
  }
  
  if (!match) {
    allPassed = false;
  }
  console.log();
});

// Check critical backend vars
console.log('📋 Critical Backend Variables:\n');
const criticalBackend = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'PRIVATE_KEY',
  'CHAIN_ID'
];

criticalBackend.forEach(key => {
  const value = backendVars[key];
  const status = value && value !== 'undefined' ? '✅' : '❌';
  console.log(`${status} ${key}: ${value ? 'SET' : 'NOT SET'}`);
  if (!value || value === 'undefined') {
    allPassed = false;
  }
});

console.log('\n' + '=' .repeat(60));
console.log(allPassed ? '✅ All environment variables are properly configured!' : '❌ Some environment variables need attention');