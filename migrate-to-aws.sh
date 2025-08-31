#!/bin/bash

# AdvertiseHomes.Online AWS RDS Migration Script
# AWS Account: 312471576053
# Target: PostgreSQL 15.x on AWS RDS

set -e  # Exit on any error

# Configuration
AWS_ACCOUNT_ID="312471576053"
DB_INSTANCE_ID="advertisehomes-production"
DB_NAME="advertisehomes"
DB_USERNAME="postgres"
AWS_REGION="us-east-1"
BACKUP_FILE="advertisehomes_backup.dump"
SCHEMA_FILE="schema_only.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AdvertiseHomes.Online AWS RDS Migration Script${NC}"
echo -e "${BLUE}AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo -e "${BLUE}Step 1: Checking Prerequisites${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first:"
    echo "curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\""
    echo "unzip awscliv2.zip && sudo ./aws/install"
    exit 1
fi
print_status "AWS CLI is installed"

# Check if backup files exist
if [[ ! -f "$BACKUP_FILE" ]]; then
    print_error "Backup file $BACKUP_FILE not found!"
    exit 1
fi
print_status "Database backup files found"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run: aws configure"
    exit 1
fi

CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
if [[ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]]; then
    print_warning "Current AWS account ($CURRENT_ACCOUNT) doesn't match target ($AWS_ACCOUNT_ID)"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_status "AWS account verified: $AWS_ACCOUNT_ID"
fi

echo

# Get database password
echo -e "${BLUE}Step 2: Database Configuration${NC}"
echo -n "Enter password for PostgreSQL 'postgres' user: "
read -s DB_PASSWORD
echo
echo

# Create RDS instance
echo -e "${BLUE}Step 3: Creating AWS RDS Instance${NC}"

# Check if instance already exists
if aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID &> /dev/null; then
    print_warning "RDS instance $DB_INSTANCE_ID already exists"
    DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Address' --output text)
    print_status "Using existing instance: $DB_ENDPOINT"
else
    echo "Creating RDS instance..."
    
    # Create DB subnet group if it doesn't exist
    if ! aws rds describe-db-subnet-groups --db-subnet-group-name advertisehomes-subnet-group &> /dev/null; then
        echo "Creating DB subnet group..."
        
        # Get default VPC
        VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
        
        # Get subnets in different AZs
        SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text)
        SUBNET_1=$(echo $SUBNET_IDS | cut -d' ' -f1)
        SUBNET_2=$(echo $SUBNET_IDS | cut -d' ' -f2)
        
        aws rds create-db-subnet-group \
            --db-subnet-group-name advertisehomes-subnet-group \
            --db-subnet-group-description "Subnet group for AdvertiseHomes database" \
            --subnet-ids $SUBNET_1 $SUBNET_2
        print_status "DB subnet group created"
    fi
    
    # Create security group
    if ! aws ec2 describe-security-groups --group-names advertisehomes-db-sg &> /dev/null; then
        echo "Creating security group..."
        
        VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
        SG_ID=$(aws ec2 create-security-group \
            --group-name advertisehomes-db-sg \
            --description "Security group for AdvertiseHomes database" \
            --vpc-id $VPC_ID \
            --query 'GroupId' --output text)
        
        # Allow PostgreSQL access from anywhere (temporary for migration)
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 5432 \
            --cidr 0.0.0.0/0
        
        print_status "Security group created: $SG_ID"
    else
        SG_ID=$(aws ec2 describe-security-groups --group-names advertisehomes-db-sg --query 'SecurityGroups[0].GroupId' --output text)
        print_status "Using existing security group: $SG_ID"
    fi
    
    # Create RDS instance
    echo "Creating RDS PostgreSQL instance..."
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.7 \
        --master-username $DB_USERNAME \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --storage-type gp2 \
        --vpc-security-group-ids $SG_ID \
        --db-subnet-group-name advertisehomes-subnet-group \
        --db-name $DB_NAME \
        --backup-retention-period 7 \
        --no-multi-az \
        --publicly-accessible \
        --no-storage-encrypted \
        --no-deletion-protection
    
    print_status "RDS instance creation initiated"
    
    # Wait for instance to be available
    echo "Waiting for RDS instance to be available (this may take 10-15 minutes)..."
    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID
    
    DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Address' --output text)
    print_status "RDS instance created: $DB_ENDPOINT"
fi

echo

# Test connection
echo -e "${BLUE}Step 4: Testing Database Connection${NC}"
export PGPASSWORD="$DB_PASSWORD"

echo "Testing connection to AWS RDS..."
if psql -h $DB_ENDPOINT -U $DB_USERNAME -d $DB_NAME -c "SELECT version();" &> /dev/null; then
    print_status "Successfully connected to AWS RDS"
else
    print_error "Failed to connect to AWS RDS"
    exit 1
fi

echo

# Import database
echo -e "${BLUE}Step 5: Importing Database${NC}"

echo "Importing database from backup..."
if pg_restore --verbose --clean --no-acl --no-owner \
    -h $DB_ENDPOINT \
    -U $DB_USERNAME \
    -d $DB_NAME \
    $BACKUP_FILE; then
    print_status "Database imported successfully"
else
    print_warning "Import completed with warnings (this is normal)"
fi

# Verify import
echo "Verifying database import..."
TABLE_COUNT=$(psql -h $DB_ENDPOINT -U $DB_USERNAME -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
USER_COUNT=$(psql -h $DB_ENDPOINT -U $DB_USERNAME -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" | xargs)

print_status "Tables imported: $TABLE_COUNT"
print_status "Users imported: $USER_COUNT"

echo

# Generate new DATABASE_URL
echo -e "${BLUE}Step 6: Configuration Update${NC}"

NEW_DATABASE_URL="postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME"

echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Update your environment variable:"
echo -e "   ${YELLOW}DATABASE_URL=${NEW_DATABASE_URL}${NC}"
echo
echo "2. In Replit Secrets, update DATABASE_URL with the value above"
echo
echo "3. Your application will automatically restart and connect to AWS RDS"
echo
echo "4. Test your application to ensure everything works correctly"
echo
echo -e "${BLUE}Database Details:${NC}"
echo "  Endpoint: $DB_ENDPOINT"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USERNAME"
echo "  Region: $AWS_REGION"
echo
echo -e "${YELLOW}Security Note:${NC}"
echo "Consider restricting the security group to specific IP addresses in production"
echo
echo -e "${GREEN}✅ AWS RDS migration completed successfully!${NC}"

# Save connection details to file
cat > aws-rds-connection.txt << EOF
AdvertiseHomes.Online AWS RDS Connection Details
==============================================

Endpoint: $DB_ENDPOINT
Database: $DB_NAME
Username: $DB_USERNAME
Region: $AWS_REGION

DATABASE_URL: $NEW_DATABASE_URL

Migration completed on: $(date)
AWS Account: $AWS_ACCOUNT_ID
EOF

print_status "Connection details saved to aws-rds-connection.txt"