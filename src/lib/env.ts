// Centralized environment variable management with validation
// This ensures no hardcoded fallbacks in production

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_ALCHEMY_ID: process.env.NEXT_PUBLIC_ALCHEMY_ID,
  NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
} as const;

// Optional environment variables with defaults
const optionalEnvVars = {
  NEXT_PUBLIC_PERFORMANCE_MODE: process.env.NEXT_PUBLIC_PERFORMANCE_MODE || 'false',
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID || '',
  NEXT_PUBLIC_ENABLE_TESTNETS: process.env.NEXT_PUBLIC_ENABLE_TESTNETS || 'true',
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '84532',
  NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS || '',
  NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || '',
} as const;

// Validate required env vars in production (but allow build to continue)
function validateEnvVars() {
  const missingVars: string[] = [];

  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value && isProduction) {
      missingVars.push(key);
    }
  });

  if (missingVars.length > 0 && isProduction) {
    // Only warn during build, don't throw - Vercel will have env vars at runtime
    console.warn(
      `Warning: Missing environment variables during build: ${missingVars.join(', ')}. ` +
      'These should be set in Vercel environment variables.'
    );
  }
}

// Run validation
if (typeof window === 'undefined') {
  // Only validate on server-side during build
  validateEnvVars();
}

// Development defaults (only used in development)
const devDefaults = {
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: 'dev_wallet_connect_id',
  NEXT_PUBLIC_ALCHEMY_ID: 'dev_alchemy_id',
  NEXT_PUBLIC_BASE_RPC_URL: 'https://base-sepolia.g.alchemy.com/v2/demo',
  NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: 'https://base-sepolia.g.alchemy.com/v2/demo',
  NEXT_PUBLIC_API_URL: 'http://localhost:4000',
  NEXT_PUBLIC_CHAIN_ID: '84532',
  NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS: '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18',
};

// Export validated environment variables
export const env = {
  // Required vars with dev fallbacks
  WALLETCONNECT_PROJECT_ID: 
    requiredEnvVars.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 
    (isDevelopment ? devDefaults.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID : ''),
  
  ALCHEMY_ID: 
    requiredEnvVars.NEXT_PUBLIC_ALCHEMY_ID || 
    (isDevelopment ? devDefaults.NEXT_PUBLIC_ALCHEMY_ID : ''),
  
  BASE_RPC_URL: 
    requiredEnvVars.NEXT_PUBLIC_BASE_RPC_URL || 
    (isDevelopment ? devDefaults.NEXT_PUBLIC_BASE_RPC_URL : ''),
  
  API_URL: 
    requiredEnvVars.NEXT_PUBLIC_API_URL || 
    (isDevelopment ? devDefaults.NEXT_PUBLIC_API_URL : ''),
  
  // Optional vars
  PERFORMANCE_MODE: optionalEnvVars.NEXT_PUBLIC_PERFORMANCE_MODE === 'true',
  SENTRY_DSN: optionalEnvVars.NEXT_PUBLIC_SENTRY_DSN,
  GA_ID: optionalEnvVars.NEXT_PUBLIC_GA_ID,
  ENABLE_TESTNETS: optionalEnvVars.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' || true, // Default to true for Base Sepolia
  CHAIN_ID: parseInt(optionalEnvVars.NEXT_PUBLIC_CHAIN_ID || '84532'),
  ESCROW_FACTORY_ADDRESS: optionalEnvVars.NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS || 
    (isDevelopment ? devDefaults.NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS : ''),
  BASE_SEPOLIA_RPC_URL: optionalEnvVars.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 
    (isDevelopment ? devDefaults.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL : ''),
  
  // Environment flags
  isDevelopment,
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
} as const;

// Type-safe environment variable access
export type Env = typeof env;