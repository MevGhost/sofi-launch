#!/bin/bash

echo "=== Fixing invalid icon names ==="

# Replace non-existent icons with valid alternatives
find src/ -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  -e 's/\bRocket\b/FiZap/g' \
  -e 's/\bPartyPopper\b/FiAward/g' \
  -e 's/\bStarOff\b/FiStar/g' \
  -e 's/\bBarChart3\b/FiBarChart2/g' \
  -e 's/\bLoader2\b/FiLoader/g' \
  -e 's/\bPercent\b/FiPercent/g' \
  -e 's/\bHash\b/FiHash/g'

echo "=== Icon replacements complete ==="