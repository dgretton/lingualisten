#!/bin/bash

# Script to concatenate all web development source files
# Excludes node_modules, build artifacts, and non-source files

OUTPUT_FILE="concatenated-source.txt"

echo "Concatenating source files..." > "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add file content with header
add_file() {
    local file="$1"
    echo "=== FILE: $file ===" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
}

# Find and process TypeScript, JavaScript, JSON, and other web files
# Exclude node_modules, dist, build, and other non-source directories
find . -type f \( \
    -name "*.ts" -o \
    -name "*.tsx" -o \
    -name "*.js" -o \
    -name "*.jsx" -o \
    -name "*.json" -o \
    -name "*.css" -o \
    -name "*.scss" -o \
    -name "*.sass" -o \
    -name "*.less" -o \
    -name "*.html" -o \
    -name "*.vue" -o \
    -name "*.svelte" \
\) \
    -not -path "./node_modules/*" \
    -not -path "./dist/*" \
    -not -path "./build/*" \
    -not -path "./.next/*" \
    -not -path "./coverage/*" \
    -not -path "./.git/*" \
    -not -path "./attached_assets/*" \
    -not -name "package-lock.json" \
    -not -name "yarn.lock" \
    -not -name "pnpm-lock.yaml" \
    | sort | while read -r file; do
    add_file "$file"
done

echo "Source files concatenated into $OUTPUT_FILE"
echo "Total files processed: $(grep -c "=== FILE:" "$OUTPUT_FILE")"
