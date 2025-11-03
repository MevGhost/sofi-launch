#!/bin/bash

# Script to fix all color inconsistencies across the codebase

echo "🎨 Fixing all color inconsistencies..."

# List of files to process
files=$(find src -name "*.tsx" -o -name "*.ts" | grep -E "(mobile|component|app)")

for file in $files; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Replace color classes systematically
    sed -i 's/bg-black/bg-canvas/g' "$file"
    sed -i 's/text-white/text-text-primary/g' "$file"
    sed -i 's/text-gray-400/text-text-muted/g' "$file"
    sed -i 's/text-gray-500/text-text-muted/g' "$file"
    sed -i 's/text-gray-600/text-text-secondary/g' "$file"
    sed -i 's/border-white\/10/border-border/g' "$file"
    sed -i 's/border-white\/\[0\.08\]/border-border/g' "$file"
    sed -i 's/border-white\/\[0\.05\]/border-border/g' "$file"
    sed -i 's/bg-white\/\[0\.03\]/bg-surface2/g' "$file"
    sed -i 's/bg-white\/\[0\.02\]/bg-surface3/g' "$file"
    sed -i 's/bg-white\/\[0\.05\]/bg-surface3/g' "$file"
    sed -i 's/bg-white\/\[0\.06\]/bg-surface2/g' "$file"
    sed -i 's/bg-white\/\[0\.08\]/bg-surface2/g' "$file"
    sed -i 's/bg-white\/\[0\.1\]/bg-surface3/g' "$file"
    sed -i 's/bg-white\/5/bg-surface3/g' "$file"
    sed -i 's/bg-white\/10/bg-surface2/g' "$file"
    sed -i 's/bg-white\/20/bg-surface3/g' "$file"
    sed -i 's/text-white\/40/text-text-muted/g' "$file"
    sed -i 's/text-white\/50/text-text-muted/g' "$file"
    sed -i 's/text-white\/60/text-text-muted/g' "$file"
    sed -i 's/text-white\/70/text-text-secondary/g' "$file"
    sed -i 's/text-white\/80/text-text-secondary/g' "$file"
    sed -i 's/bg-gray-800/bg-surface2/g' "$file"
    sed -i 's/bg-gray-900/bg-surface/g' "$file"
    sed -i 's/bg-black\/50/bg-surface\/50/g' "$file"
    sed -i 's/bg-black\/60/bg-surface\/60/g' "$file"
    sed -i 's/bg-black\/80/bg-surface\/80/g' "$file"
    sed -i 's/bg-black\/90/bg-surface\/90/g' "$file"
    sed -i 's/bg-black\/95/bg-surface/g' "$file"
    sed -i 's/hover:text-white/hover:text-text-primary/g' "$file"
    sed -i 's/hover:bg-white/hover:bg-surface3/g' "$file"
    
    # Remove backup if successful
    if [ $? -eq 0 ]; then
      rm "$file.bak"
    else
      echo "Error processing $file, restoring backup"
      mv "$file.bak" "$file"
    fi
  fi
done

echo "✅ Color fix complete!"