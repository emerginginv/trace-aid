curl -s -X POST https://bkggcrpndywvyflwocws.supabase.co/rest/v1/rpc/get_db_time \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d '"' -f 2)"
