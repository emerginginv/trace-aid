-- Migration to add missing columns to organization_settings table
-- This fixes the error: column organization_settings.user_id does not exist

ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS agency_license_number text,
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS case_request_default_instructions text,
ADD COLUMN IF NOT EXISTS case_request_notification_emails text[],
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS email_signature text,
ADD COLUMN IF NOT EXISTS fein_number text,
ADD COLUMN IF NOT EXISTS sender_email text,
ADD COLUMN IF NOT EXISTS signature_email text,
ADD COLUMN IF NOT EXISTS signature_name text,
ADD COLUMN IF NOT EXISTS signature_phone text,
ADD COLUMN IF NOT EXISTS signature_title text,
ADD COLUMN IF NOT EXISTS terms text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Note: user_id should probably be nullable if settings are org-wide, 
-- but the query in the error message is filtering by it.
-- Let's populate it with the owner's ID if possible, or just leave it nullable for now.

COMMENT ON COLUMN public.organization_settings.user_id IS 'Associated user ID if these are user-specific organization settings.';
