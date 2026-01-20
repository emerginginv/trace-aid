-- Create retainer_funds table
CREATE TABLE public.retainer_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.retainer_funds ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own retainer funds
CREATE POLICY "Users can manage own retainer funds"
ON public.retainer_funds
FOR ALL
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_retainer_funds_case_id ON public.retainer_funds(case_id);

-- Insert some dummy data for testing
INSERT INTO public.retainer_funds (case_id, user_id, amount, note, created_at)
SELECT 
  c.id,
  c.user_id,
  5000.00,
  'Initial retainer deposit',
  now() - interval '30 days'
FROM public.cases c
LIMIT 1;