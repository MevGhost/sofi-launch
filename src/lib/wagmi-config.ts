import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { env } from './env';

// Custom Base Sepolia configuration with our RPC
const baseSepoliaCustom = {
  ...baseSepolia,
  rpcUrls: {
    default: {
      http: [env.BASE_SEPOLIA_RPC_URL || `https://base-sepolia.g.alchemy.com/v2/${env.ALCHEMY_ID}`],
    },
    public: {
      http: ['https://sepolia.base.org'],
    },
    alchemy: {
      http: [`https://base-sepolia.g.alchemy.com/v2/${env.ALCHEMY_ID}`],
    },
  },
};

// Create wagmi config singleton to prevent re-initialization
let wagmiConfigInstance: ReturnType<typeof getDefaultConfig> | null = null;

export function getWagmiConfig() {
  if (!wagmiConfigInstance) {
    wagmiConfigInstance = getDefaultConfig({
      appName: 'S4 Labs',
      projectId: env.WALLETCONNECT_PROJECT_ID,
      chains: [baseSepoliaCustom],
      ssr: true,
      transports: {
        [baseSepoliaCustom.id]: http(baseSepoliaCustom.rpcUrls.default.http[0]),
      },
    });
  }
  return wagmiConfigInstance;
}

export const wagmiConfig = getWagmiConfig();

// Export chain for use in components
export const DEFAULT_CHAIN = baseSepoliaCustom;
export const CHAIN_ID = baseSepoliaCustom.id;

// Contract addresses for Base Sepolia
export const CONTRACTS = {
  ESCROW_FACTORY: env.ESCROW_FACTORY_ADDRESS as `0x${string}`,
  // Use dedicated token factory address when provided; fall back to escrow factory only if absent
  TOKEN_FACTORY: (process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || env.ESCROW_FACTORY_ADDRESS) as `0x${string}`,
} as const;