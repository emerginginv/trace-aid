-- Add sender_email column to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS sender_email TEXT;