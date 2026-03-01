curl -i -X POST https://bkggcrpndywvyflwocws.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(supabase secrets list | awk '/SUPABASE_ANON_KEY/ {print $3}')" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test email.",
    "isHtml": false
  }'
