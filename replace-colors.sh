#!/bin/bash

# Replace all orange colors with blue variants in the codebase

echo "Replacing orange colors with blue variants..."

# Find all TypeScript/TSX files and replace orange colors
find /home/puwpl/Desktop/frontend/s4labs/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e 's/from-orange-500/from-[#0EA5E9]/g' \
  -e 's/to-orange-500/to-[#06B6D4]/g' \
  -e 's/via-orange-500/via-[#0EA5E9]/g' \
  -e 's/from-orange-600/from-[#0052FF]/g' \
  -e 's/to-orange-600/to-[#0077FF]/g' \
  -e 's/via-orange-600/via-[#0052FF]/g' \
  -e 's/bg-orange-500/bg-[#0EA5E9]/g' \
  -e 's/bg-orange-600/bg-[#0052FF]/g' \
  -e 's/bg-orange-400/bg-[#06B6D4]/g' \
  -e 's/text-orange-400/text-[#06B6D4]/g' \
  -e 's/text-orange-500/text-[#0EA5E9]/g' \
  -e 's/text-orange-600/text-[#0052FF]/g' \
  -e 's/border-orange-500/border-[#0EA5E9]/g' \
  -e 's/border-orange-600/border-[#0052FF]/g' \
  -e 's/shadow-orange-500/shadow-[#0EA5E9]/g' \
  -e 's/shadow-orange-600/shadow-[#0052FF]/g' \
  -e 's/hover:from-orange-500/hover:from-[#0EA5E9]/g' \
  -e 's/hover:to-orange-500/hover:to-[#06B6D4]/g' \
  -e 's/hover:from-orange-600/hover:from-[#0052FF]/g' \
  -e 's/hover:to-orange-600/hover:to-[#0077FF]/g' \
  -e 's/from-orange-950/from-blue-950/g' \
  -e 's/to-orange-950/to-blue-950/g' \
  -e 's/bg-orange-950/bg-blue-950/g' {} \;

echo "Color replacement complete!"