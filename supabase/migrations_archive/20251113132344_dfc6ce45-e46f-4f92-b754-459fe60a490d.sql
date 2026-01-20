-- Add email signature fields to organization_settings table
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS email_signature TEXT,
ADD COLUMN IF NOT EXISTS signature_name TEXT,
ADD COLUMN IF NOT EXISTS signature_title TEXT,
ADD COLUMN IF NOT EXISTS signature_phone TEXT,
ADD COLUMN IF NOT EXISTS signature_email TEXT;