-- Create case_request_history table for tracking events
CREATE TABLE public.case_request_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_request_id uuid NOT NULL REFERENCES public.case_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes for efficient queries
CREATE INDEX idx_case_request_history_request_id ON public.case_request_history(case_request_id);
CREATE INDEX idx_case_request_history_performed_at ON public.case_request_history(performed_at DESC);

-- Enable RLS
ALTER TABLE public.case_request_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view history for their org requests"
  ON public.case_request_history FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert history for their org requests"
  ON public.case_request_history FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));