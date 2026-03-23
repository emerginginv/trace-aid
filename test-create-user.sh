#!/bin/bash

# Test the create-user function
# This requires a valid JWT token from a logged-in admin user

echo "Testing create-user function..."
echo "Note: This requires MAILJET_API_KEY and MAILJET_SECRET_KEY to be set in Supabase"

curl -i -X POST https://bkggcrpndywvyflwocws.supabase.co/functions/v1/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "investigator",
    "organizationId": "YOUR_ORG_ID_HERE"
  }'