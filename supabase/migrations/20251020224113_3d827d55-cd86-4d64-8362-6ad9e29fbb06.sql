-- Add assigned_user_id and status fields to case_activities table
ALTER TABLE public.case_activities 
ADD COLUMN assigned_user_id uuid REFERENCES auth.users(id),
ADD COLUMN status text NOT NULL DEFAULT 'to_do';

-- Update existing records to have default status based on completed field
UPDATE public.case_activities
SET status = CASE 
  WHEN completed = true THEN 'done'
  ELSE 'to_do'
END;

-- Add comment to explain the status field
COMMENT ON COLUMN public.case_activities.status IS 'For tasks: to_do, in_progress, blocked, done. For events: scheduled, cancelled, completed';

-- Add comment to explain assigned_user_id
COMMENT ON COLUMN public.case_activities.assigned_user_id IS 'User assigned to this task or event';