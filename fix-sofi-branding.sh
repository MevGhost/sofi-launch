#!/bin/bash

# Fix SoFi Launch Branding - Targeted Updates
TARGET_DIR="/Users/kalhawari/Downloads/solana-launchpad"

echo "🔧 Fixing SoFi Launch branding..."

cd "$TARGET_DIR" || exit 1

# Update HomePage.tsx - Main hero section
sed -i '' 's/Powered by Base L2 & AlienBase/Powered by Solana/g' src/components/HomePage.tsx
sed -i '' 's/Launch Your Token on Base L2/Launch Your Token on Solana/g' src/components/HomePage.tsx
sed -i '' 's/on Base L2/on Solana/g' src/components/HomePage.tsx

# Update all S4 references to SoFi
sed -i '' 's/<span className="text-white font-bold text-sm font-display">S4<\/span>/<span className="text-white font-bold text-sm font-display">SoFi<\/span>/g' src/components/HomePage.tsx
sed -i '' 's/S4 Labs/SoFi Launch/g' src/components/HomePage.tsx
sed -i '' 's/S4Labs/SoFi Launch/g' src/components/HomePage.tsx

# Update FAQ section
sed -i '' 's/BaseSwap\/Uniswap/Raydium\/Orca/g' src/components/HomePage.tsx
sed -i '' 's/Base L2 and AlienBase/Solana/g' src/components/HomePage.tsx
sed -i '' 's/0\.01 ETH/0\.01 SOL/g' src/components/HomePage.tsx

# Update layout files
sed -i '' 's/S4 Labs - Token Launchpad on Base L2/SoFi Launch - Token Launchpad on Solana/g' src/app/layout.tsx
sed -i '' 's/S4 Labs - Token Launchpad/SoFi Launch - Token Launchpad/g' src/app/layout.tsx
sed -i '' 's/Launch your token on Base L2 with S4 Labs/Launch your token on Solana with SoFi Launch/g' src/app/token/new/layout.tsx
sed -i '' 's/Launch your token on Base L2/Launch your token on Solana/g' src/app/token/new/page.tsx
sed -i '' 's/Launch Your Token on Base L2/Launch Your Token on Solana/g' src/app/token/new/page.tsx

# Update logo text in header
sed -i '' 's/"Token Launchpad"/"Launch"/g' src/components/HomePage.tsx

# Update footer copyright
sed -i '' 's/© 2025 S4 Labs/© 2025 SoFi Launch/g' src/components/HomePage.tsx
sed -i '' 's/S4 Labs is dedicated to enhancing the trading experience on DeFi by offering a CEX-like interface combined with the privacy benefits of decentralized finance. S4 Labs is developed and managed independently of the Coinbase \/ Base team/SoFi Launch is dedicated to providing a fair and transparent token launchpad on Solana. Built by the community, for the community./g' src/components/HomePage.tsx

# Update ALB references to a Solana token (we'll use SOL for now)
sed -i '' 's/ALB /SOL /g' src/components/HomePage.tsx
sed -i '' 's/ALB tokens/SOL tokens/g' src/components/HomePage.tsx
sed -i '' 's/with ALB/with SOL/g' src/components/HomePage.tsx

# Update package.json name if it hasn't been updated
sed -i '' 's/"name": "s4labs"/"name": "sofilaunch"/g' package.json

echo "✨ Branding updated successfully!"
echo "📍 Changes applied to: $TARGET_DIR"
echo ""
echo "🔄 Restart your dev server to see changes:"
echo "   cd $TARGET_DIR && npm run dev"
