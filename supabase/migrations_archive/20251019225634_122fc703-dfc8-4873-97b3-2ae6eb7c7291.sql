-- Create case_subjects table for people, vehicles, locations, items
CREATE TABLE public.case_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  user_id UUID NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('person', 'vehicle', 'location', 'item')),
  name TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case_activities table for tasks and events
CREATE TABLE public.case_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('task', 'event')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case_finances table for retainer funds, expenses, billing/invoices
CREATE TABLE public.case_finances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  user_id UUID NOT NULL,
  finance_type TEXT NOT NULL CHECK (finance_type IN ('retainer', 'expense', 'invoice')),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.case_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_finances ENABLE ROW LEVEL SECURITY;

-- RLS policies for case_subjects
CREATE POLICY "Users can manage own case subjects"
ON public.case_subjects
FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for case_activities
CREATE POLICY "Users can manage own case activities"
ON public.case_activities
FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for case_finances
CREATE POLICY "Users can manage own case finances"
ON public.case_finances
FOR ALL
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_case_subjects_updated_at
BEFORE UPDATE ON public.case_subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_case_activities_updated_at
BEFORE UPDATE ON public.case_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_case_finances_updated_at
BEFORE UPDATE ON public.case_finances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();