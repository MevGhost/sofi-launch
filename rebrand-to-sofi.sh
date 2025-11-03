#!/bin/bash

# SoFi Launch Rebranding Script
# This script rebrands S4 Launchpad to SoFi Launch (Solana version)

TARGET_DIR="/Users/kalhawari/Downloads/solana-launchpad"

echo "🚀 Starting SoFi Launch rebranding..."

cd "$TARGET_DIR" || exit 1

# Function to replace text in files
replace_text() {
    local search="$1"
    local replace="$2"
    
    # Find all text files and replace
    find . -type f \( \
        -name "*.ts" -o \
        -name "*.tsx" -o \
        -name "*.js" -o \
        -name "*.jsx" -o \
        -name "*.json" -o \
        -name "*.md" -o \
        -name "*.html" -o \
        -name "*.css" -o \
        -name "*.env*" \
    \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.next/*" -exec sed -i '' "s/$search/$replace/g" {} +
}

echo "📝 Updating brand name..."
replace_text "S4 Labs" "SoFi Launch"
replace_text "S4Labs" "SoFiLaunch"
replace_text "s4labs" "sofilaunch"
replace_text "S4 Launchpad" "SoFi Launch"
replace_text "s4launchpad" "sofi-launch"

echo "🔗 Updating blockchain references..."
replace_text "Base Sepolia" "Solana Devnet"
replace_text "Base Mainnet" "Solana Mainnet"
replace_text "Base" "Solana"
replace_text "ETH" "SOL"
replace_text "Ethereum" "Solana"
replace_text "base-sepolia" "solana-devnet"
replace_text "basescan" "solscan"

echo "📦 Updating package.json..."
cat > package.json << 'EOF'
{
  "name": "sofilaunch",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.1.6",
    "@sentry/nextjs": "^8.42.0",
    "@solana/web3.js": "^1.95.8",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@tanstack/react-query": "^5.62.3",
    "framer-motion": "^11.11.17",
    "lucide-react": "^0.462.0",
    "next": "14.2.31",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "viem": "^2.21.54",
    "wagmi": "^2.12.29",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.31",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
EOF

echo "🌐 Updating README..."
cat > README.md << 'EOF'
# SoFi Launch 🚀

A decentralized token launchpad built on Solana, enabling creators to launch and trade tokens with bonding curve mechanics.

## Features

- 🪙 **Token Creation**: Launch tokens on Solana with customizable parameters
- 📈 **Bonding Curve Trading**: Automated market making with fair price discovery
- 💼 **Portfolio Management**: Track your token holdings and performance
- 🔒 **Escrow System**: Secure milestone-based payments for token launches
- 📊 **Real-time Analytics**: Live trading data and token metrics

## Technology Stack

- **Blockchain**: Solana (Devnet/Mainnet)
- **Frontend**: Next.js 14, React 18, TypeScript
- **Wallet**: Solana Wallet Adapter
- **Styling**: Tailwind CSS, Framer Motion
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Solana wallet (Phantom, Solflare, etc.)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

## Deployment

Built for deployment on Vercel:

```bash
npm run build
npm run start
```

## License

MIT License

## Contact

For questions or support, please open an issue on GitHub.
EOF

echo "✨ Rebranding complete!"
echo "📍 Project location: $TARGET_DIR"
echo ""
echo "Next steps:"
echo "1. cd $TARGET_DIR"
echo "2. Review changes"
echo "3. git add -A"
echo "4. git commit -m 'Initial commit: SoFi Launch (Solana version)'"
echo "5. git remote add origin https://github.com/gotmygat/sofi-launch.git"
echo "6. git push -u origin main"
