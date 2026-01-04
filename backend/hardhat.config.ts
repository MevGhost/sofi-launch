import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify"; // Uncomment when needed
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
    },
    "base-mainnet": {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
   etherscan: { // Uncomment when hardhat-verify is installed
     apiKey: {
       "base-sepolia": process.env.BASESCAN_API_KEY || "",
       "base": process.env.BASESCAN_API_KEY || ""
     },
     customChains: [
       {
         network: "base-sepolia",
         chainId: 84532,
         urls: {
           apiURL: "https://api-sepolia.basescan.org/api",
           browserURL: "https://sepolia.basescan.org"
         }
       }
     ]
   },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;