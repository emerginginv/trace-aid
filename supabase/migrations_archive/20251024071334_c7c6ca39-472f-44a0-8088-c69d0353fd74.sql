-- Add vendor role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendor';