#!/bin/bash

# Test the get_pending_invites RPC function
# This requires a valid JWT token from a logged-in admin user

echo "Testing get_pending_invites RPC function..."

curl -i -X POST https://bkggcrpndywvyflwocws.supabase.co/rest/v1/rpc/get_pending_invites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2djcnBuZHl3dnlmbHdvY3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzM0NzMsImV4cCI6MjA4NDUwOTQ3M30.IJDEqQKPNsZ6eRGEnwbHJNTyQ5vSkTjkXbaY9YTgNr4" \
  -d '{"p_organization_id": "YOUR_ORG_ID_HERE"}'