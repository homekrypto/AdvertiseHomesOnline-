# 🚀 Complete AWS Migration Guide - AdvertiseHomes.Online
**Target AWS Account:** 312471576053

## 📋 Overview
This guide will migrate your entire AdvertiseHomes.Online platform to AWS, including:
- ✅ PostgreSQL database migration to AWS RDS
- ✅ Application deployment setup
- ✅ Environment configuration
- ✅ Stripe integration preservation
- ✅ Email service configuration

## 🎯 Prerequisites

### Required Tools
- AWS CLI v2
- PostgreSQL client tools
- Your AWS Access Key ID & Secret
- Strong database password

### Files Included
- `database_backup_20250831_210211.dump` (25.6 KB) - Complete database
- `schema_backup_20250831_210215.sql` (13 KB) - Schema structure
- `setup-aws-migration.sh` - Prerequisites installer
- `migrate-to-aws.sh` - Main migration script
- `verify-migration.sh` - Migration verifier

## 🔧 Step 1: Setup AWS Environment

### Download Migration Package
From your Replit environment, download these files:
- All migration scripts (`*.sh`)
- Database backup files (`*.dump`, `*.sql`)

### Run Setup Script
```bash
chmod +x setup-aws-migration.sh
./setup-aws-migration.sh
```

### Configure AWS Credentials
```bash
aws configure
```
Enter your AWS credentials for account **312471576053**:
- Access Key ID: [Your AWS Access Key]
- Secret Access Key: [Your AWS Secret Key]
- Region: us-east-1
- Output format: json

## 🗄️ Step 2: Database Migration

### Run Migration Script
```bash
chmod +x migrate-to-aws.sh
./migrate-to-aws.sh
```

This script will:
1. ✅ Create AWS RDS PostgreSQL instance
2. ✅ Configure security groups and networking
3. ✅ Import your complete database (2 users, 4 plans, 15 tables)
4. ✅ Generate new DATABASE_URL
5. ✅ Save connection details

### Expected Output
```
🎉 Migration Complete!

DATABASE_URL: postgresql://postgres:[PASSWORD]@[ENDPOINT]:5432/advertisehomes
```

## ✅ Step 3: Verify Migration

### Run Verification
```bash
chmod +x verify-migration.sh
./verify-migration.sh
```

### Expected Results
- ✅ Database connection: PASS
- ✅ Table count: 15 tables
- ✅ User data: 2 users
- ✅ Subscription plans: 4 plans
- ✅ Admin user exists: PASS

## 🔧 Step 4: Update Replit Configuration

### Update Environment Variables
In your Replit project:

1. **Go to Secrets (🔒 icon)**
2. **Update DATABASE_URL** with the new AWS RDS URL
3. **Your app will restart automatically**

### Environment Variables to Verify
```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[AWS-ENDPOINT]:5432/advertisehomes

# Existing secrets (should remain unchanged)
STRIPE_SECRET_KEY=[your-stripe-key]
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=support@advertisehomes.online
SMTP_PASSWORD=[your-smtp-password]
```

## 🌐 Step 5: Application Deployment (Optional)

### For Full AWS Deployment
If you want to deploy the entire application to AWS:

1. **EC2 Instance Setup**
   - Launch Ubuntu 22.04 LTS instance
   - Install Node.js 20.x
   - Clone your repository

2. **Application Configuration**
   ```bash
   npm install
   npm run build
   npm run dev
   ```

3. **Load Balancer & Domain**
   - Configure Application Load Balancer
   - Set up SSL certificate
   - Point your domain to AWS

## 🔍 Step 6: Testing & Validation

### Test Application Features
1. **Authentication**
   - Login with existing users
   - Registration flow
   - Email verification

2. **Subscription System**
   - Stripe payment processing
   - Plan upgrades/downgrades
   - Billing webhooks

3. **Core Features**
   - Property listings
   - User dashboard
   - Agent tools

## 🛡️ Security Configuration

### Production Security Settings
```bash
# Restrict database access to your application only
aws ec2 modify-security-group-rules \
  --group-id [SG-ID] \
  --security-group-rules \
  'SecurityGroupRuleId=[RULE-ID],SecurityGroupRule={IpProtocol=tcp,FromPort=5432,ToPort=5432,CidrIpv4=[YOUR-APP-IP]/32}'
```

### SSL/TLS Configuration
- Enable RDS encryption for production
- Use SSL certificates for application
- Configure HTTPS redirects

## 📊 Cost Estimation

### AWS RDS Costs (Monthly)
- **db.t3.micro**: ~$15-20/month
- **20GB storage**: ~$2-3/month
- **Data transfer**: ~$1-5/month
- **Total**: ~$18-28/month

### Scaling Options
- **db.t3.small**: Better performance (~$30/month)
- **Multi-AZ**: High availability (+100% cost)
- **Read replicas**: Read scaling (+instance cost)

## 🚨 Rollback Plan

### If Migration Issues Occur
1. **Keep Replit database active** during testing
2. **Switch DATABASE_URL back** to original
3. **Contact support** if needed

### Emergency Contacts
- AWS Support: Account 312471576053
- Replit Support: For Replit-specific issues

## ✅ Success Checklist

### Database Migration
- [ ] RDS instance created
- [ ] Database imported successfully
- [ ] All 15 tables present
- [ ] User accounts migrated
- [ ] Subscription plans imported

### Application
- [ ] New DATABASE_URL configured
- [ ] Application starts without errors
- [ ] Login/authentication works
- [ ] Stripe payments functional
- [ ] Email notifications working

### Production Ready
- [ ] Security groups configured
- [ ] SSL certificates installed
- [ ] Domain pointing to AWS
- [ ] Monitoring configured
- [ ] Backups automated

## 📞 Support Information

### Migration Support
- **AWS Console**: https://312471576053.signin.aws.amazon.com/console
- **RDS Dashboard**: Monitor database performance
- **CloudWatch**: Application and database logs

### Troubleshooting
Common issues and solutions:
1. **Connection timeout**: Check security groups
2. **Authentication failed**: Verify credentials
3. **Performance issues**: Consider instance upgrade
4. **SSL errors**: Update connection strings

---

**🎯 Your complete AdvertiseHomes.Online platform is ready for AWS!**

After migration, you'll have:
- ✅ Professional AWS RDS database
- ✅ All user accounts and data preserved
- ✅ Stripe integration maintained
- ✅ Email services working
- ✅ Scalable infrastructure

**Total migration time: 30-60 minutes**
**Downtime: < 5 minutes** (just for DATABASE_URL update)