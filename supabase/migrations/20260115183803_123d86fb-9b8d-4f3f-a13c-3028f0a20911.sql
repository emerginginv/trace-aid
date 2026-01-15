-- Add status column to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add status column to contacts  
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add role column to contacts if needed
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role text;

-- Add check constraints for valid statuses
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_status_check'
  ) THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_status_check 
      CHECK (status IS NULL OR status IN ('active', 'inactive', 'on_hold'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_status_check'
  ) THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_status_check 
      CHECK (status IS NULL OR status IN ('active', 'inactive'));
  END IF;
END $$;