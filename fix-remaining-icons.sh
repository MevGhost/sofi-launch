#!/bin/bash

echo "=== Fixing remaining non-react-icons imports ==="

# Replace non-existent icons with valid alternatives
find src/ -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  -e 's/\bLayoutGrid\b/FiGrid/g' \
  -e 's/\bSparkles\b/FiStar/g' \
  -e 's/\bUserCheck\b/FiUserCheck/g' \
  -e 's/\bCoins\b/FiDollarSign/g' \
  -e 's/\bGrid3x3\b/FiGrid/g' \
  -e 's/\bSlidersHorizontal\b/FiSliders/g' \
  -e 's/\bLink2\b/FiLink/g'

echo "=== Replacements complete ==="