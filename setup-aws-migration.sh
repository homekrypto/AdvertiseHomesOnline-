#!/bin/bash

# Quick setup script for AWS migration
# Run this first to install dependencies and prepare for migration

set -e

echo "🔧 Setting up AWS Migration Prerequisites"
echo "========================================"

# Install AWS CLI v2 if not present
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI v2..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf awscliv2.zip aws/
    echo "✓ AWS CLI installed"
else
    echo "✓ AWS CLI already installed"
fi

# Check if PostgreSQL client tools are available
if ! command -v psql &> /dev/null || ! command -v pg_restore &> /dev/null; then
    echo "Installing PostgreSQL client tools..."
    sudo apt-get update -qq
    sudo apt-get install -y postgresql-client
    echo "✓ PostgreSQL client tools installed"
else
    echo "✓ PostgreSQL client tools available"
fi

# Verify backup files exist
if [[ -f "database_backup_20250831_210211.dump" ]]; then
    echo "✓ Latest database backup file found (database_backup_20250831_210211.dump)"
elif [[ -f "advertisehomes_backup.dump" ]]; then
    echo "✓ Database backup file found (advertisehomes_backup.dump)"
else
    echo "⚠ Database backup file not found - creating it now..."
    if [[ -n "$DATABASE_URL" ]]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        pg_dump $DATABASE_URL --verbose --no-owner --no-privileges --format=custom --file=database_backup_${TIMESTAMP}.dump
        echo "✓ Database backup created: database_backup_${TIMESTAMP}.dump"
    else
        echo "❌ DATABASE_URL not set - cannot create backup"
        exit 1
    fi
fi

echo
echo "🎯 Setup Complete!"
echo "=================="
echo
echo "Next steps:"
echo "1. Configure AWS credentials: aws configure"
echo "2. Run the migration script: ./migrate-to-aws.sh"
echo
echo "Make sure you have:"
echo "- AWS Access Key ID"
echo "- AWS Secret Access Key"
echo "- Default region (recommended: us-east-1)"
echo "- A strong password for your RDS instance"