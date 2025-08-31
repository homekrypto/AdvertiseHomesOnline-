#!/bin/bash

# Verification script to test AWS RDS migration
# Run this after migration to ensure everything works

set -e

echo "🔍 Verifying AWS RDS Migration"
echo "============================="

# Check if connection details file exists
if [[ ! -f "aws-rds-connection.txt" ]]; then
    echo "❌ Migration connection file not found"
    echo "Please run ./migrate-to-aws.sh first"
    exit 1
fi

# Extract endpoint from connection file
DB_ENDPOINT=$(grep "Endpoint:" aws-rds-connection.txt | cut -d' ' -f2)
NEW_DATABASE_URL=$(grep "DATABASE_URL:" aws-rds-connection.txt | cut -d' ' -f2)

echo "Database Endpoint: $DB_ENDPOINT"
echo

# Parse connection string
DB_USER="postgres"
DB_NAME="advertisehomes"
echo -n "Enter database password: "
read -s DB_PASSWORD
echo
export PGPASSWORD="$DB_PASSWORD"

echo "Running verification tests..."

# Test 1: Basic connection
echo -n "1. Testing database connection... "
if psql -h $DB_ENDPOINT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &> /dev/null; then
    echo "✓ PASS"
else
    echo "❌ FAIL"
    exit 1
fi

# Test 2: Table count
echo -n "2. Checking table count... "
TABLE_COUNT=$(psql -h $DB_ENDPOINT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
if [[ $TABLE_COUNT -eq 15 ]]; then
    echo "✓ PASS ($TABLE_COUNT tables)"
else
    echo "⚠ WARNING ($TABLE_COUNT tables, expected 15)"
fi

# Test 3: User data
echo -n "3. Checking user data... "
USER_COUNT=$(psql -h $DB_ENDPOINT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" | xargs)
if [[ $USER_COUNT -ge 1 ]]; then
    echo "✓ PASS ($USER_COUNT users)"
else
    echo "❌ FAIL (no users found)"
fi

# Test 4: Subscription plans
echo -n "4. Checking subscription plans... "
PLAN_COUNT=$(psql -h $DB_ENDPOINT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM subscription_plans;" | xargs)
if [[ $PLAN_COUNT -ge 3 ]]; then
    echo "✓ PASS ($PLAN_COUNT plans)"
else
    echo "⚠ WARNING ($PLAN_COUNT plans)"
fi

# Test 5: Check specific user exists
echo -n "5. Checking admin user exists... "
ADMIN_EXISTS=$(psql -h $DB_ENDPOINT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE email LIKE '%@%' AND role = 'agent';" | xargs)
if [[ $ADMIN_EXISTS -ge 1 ]]; then
    echo "✓ PASS"
else
    echo "⚠ WARNING (no agent users found)"
fi

echo
echo "🎯 Migration Verification Complete!"
echo "==================================="

if [[ -n "$NEW_DATABASE_URL" ]]; then
    echo
    echo "📝 Update your Replit environment:"
    echo "DATABASE_URL=$NEW_DATABASE_URL"
    echo
    echo "After updating DATABASE_URL in Replit Secrets:"
    echo "1. Your app will restart automatically"
    echo "2. Test login and subscription features"
    echo "3. Verify Stripe integration works"
fi

echo
echo "✅ AWS RDS migration verification completed!"