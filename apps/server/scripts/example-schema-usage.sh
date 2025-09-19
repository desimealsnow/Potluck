#!/bin/bash

# Example usage of the Supabase Schema Validation & Sync Script
# This script demonstrates common use cases for the schema validation tool

echo "🚀 Supabase Schema Validation Examples"
echo "======================================"

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables"
    echo "   You can set them in your .env file or export them:"
    echo "   export SUPABASE_URL='your_supabase_url'"
    echo "   export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'"
    exit 1
fi

echo "✅ Environment variables are set"
echo ""

# Example 1: Basic validation
echo "📋 Example 1: Basic Schema Validation"
echo "-------------------------------------"
echo "Running: npm run schema:validate"
npm run schema:validate
echo ""

# Example 2: Verbose validation
echo "📋 Example 2: Verbose Schema Validation"
echo "---------------------------------------"
echo "Running: npm run schema:validate:verbose"
npm run schema:validate:verbose
echo ""

# Example 3: Generate fixes (dry run)
echo "📋 Example 3: Generate Schema Fixes"
echo "-----------------------------------"
echo "Running: npm run schema:fix"
npm run schema:fix
echo ""

# Example 4: Dry run sync
echo "📋 Example 4: Dry Run Sync"
echo "--------------------------"
echo "Running: npm run schema:sync:dry"
npm run schema:sync:dry
echo ""

# Example 5: Sync with backup
echo "📋 Example 5: Sync with Backup"
echo "------------------------------"
echo "Running: npm run schema:sync"
echo "⚠️  This will modify your validators.ts file!"
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run schema:sync
else
    echo "Skipped sync operation"
fi

echo ""
echo "✅ All examples completed!"
echo ""
echo "📚 For more information, see:"
echo "   - SCHEMA_VALIDATION_README.md"
echo "   - Run: node scripts/validate-schema.mjs --help"
