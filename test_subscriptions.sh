#!/bin/bash

# PRODUCTION SUBSCRIPTION TESTING SCRIPT
# Run these commands after creating Stripe prices

echo "🧪 TESTING AGENT MONTHLY SUBSCRIPTION"
curl -X POST http://localhost:5000/api/create-subscription \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"1ba87785-5503-41af-bb91-d7830c431449\",\"planId\":\"agent\",\"billingInterval\":\"monthly\"}"

echo -e "\n\n🧪 TESTING AGENCY ANNUAL SUBSCRIPTION"  
curl -X POST http://localhost:5000/api/create-subscription \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"1ba87785-5503-41af-bb91-d7830c431449\",\"planId\":\"agency\",\"billingInterval\":\"yearly\"}"

echo -e "\n\n🧪 TESTING EXPERT MONTHLY SUBSCRIPTION"
curl -X POST http://localhost:5000/api/create-subscription \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"1ba87785-5503-41af-bb91-d7830c431449\",\"planId\":\"expert\",\"billingInterval\":\"monthly\"}"

echo -e "\n\n✅ TESTING COMPLETE"
