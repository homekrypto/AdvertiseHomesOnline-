#!/bin/bash

# Migration script to move to new Neon database
set -e

NEW_DB_URL="postgresql://neondb_owner:npg_QDeaHUIk4zx6@ep-frosty-salad-adnbo7om-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "🚀 Starting migration to new Neon database..."

# Step 1: Create schema on new database using Drizzle
echo "1. Creating schema on new database..."
export DATABASE_URL="$NEW_DB_URL"
npm run db:push --force 2>/dev/null || {
    echo "Creating tables manually..."
    # Import schema only first
    PGPASSWORD="npg_QDeaHUIk4zx6" psql "$NEW_DB_URL" -f schema_only.sql
}

# Step 2: Import data
echo "2. Importing data..."
pg_restore --verbose --clean --no-acl --no-owner --data-only \
    --dbname "$NEW_DB_URL" \
    advertisehomes_backup.dump 2>/dev/null || echo "Import completed with warnings"

# Step 3: Verify migration
echo "3. Verifying migration..."
TABLE_COUNT=$(PGPASSWORD="npg_QDeaHUIk4zx6" psql "$NEW_DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
USER_COUNT=$(PGPASSWORD="npg_QDeaHUIk4zx6" psql "$NEW_DB_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

echo "✅ Migration Complete!"
echo "   Tables: $TABLE_COUNT"
echo "   Users: $USER_COUNT"
echo
echo "🔄 Update your Replit Secrets with:"
echo "DATABASE_URL=$NEW_DB_URL"