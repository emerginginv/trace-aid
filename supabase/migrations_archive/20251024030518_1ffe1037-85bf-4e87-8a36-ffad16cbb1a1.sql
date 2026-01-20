-- Create picklists table for managing case status and update type values
CREATE TABLE IF NOT EXISTS public.picklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'case_status' or 'update_type'
  value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.picklists ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own picklists"
ON public.picklists
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Insert default case status values for existing users
INSERT INTO public.picklists (user_id, type, value, is_active, display_order)
SELECT DISTINCT user_id, 'case_status', 'open', true, 1 FROM cases
UNION ALL
SELECT DISTINCT user_id, 'case_status', 'pending', true, 2 FROM cases
UNION ALL
SELECT DISTINCT user_id, 'case_status', 'closed', true, 3 FROM cases
ON CONFLICT DO NOTHING;