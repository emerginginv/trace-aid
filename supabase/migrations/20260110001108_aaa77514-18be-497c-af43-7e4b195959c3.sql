-- Create help_categories table for managing category ordering and display
CREATE TABLE public.help_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help_articles table for article content
CREATE TABLE public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.help_categories(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  related_feature TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- Help categories are readable by all authenticated users
CREATE POLICY "Help categories are viewable by authenticated users"
ON public.help_categories
FOR SELECT
TO authenticated
USING (true);

-- Help articles are readable by all authenticated users
CREATE POLICY "Help articles are viewable by authenticated users"
ON public.help_articles
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage help categories
CREATE POLICY "Admins can insert help categories"
ON public.help_categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

CREATE POLICY "Admins can update help categories"
ON public.help_categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

CREATE POLICY "Admins can delete help categories"
ON public.help_categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Only admins can manage help articles
CREATE POLICY "Admins can insert help articles"
ON public.help_articles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

CREATE POLICY "Admins can update help articles"
ON public.help_articles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

CREATE POLICY "Admins can delete help articles"
ON public.help_articles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Create updated_at trigger for help_categories
CREATE TRIGGER update_help_categories_updated_at
BEFORE UPDATE ON public.help_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for help_articles
CREATE TRIGGER update_help_articles_updated_at
BEFORE UPDATE ON public.help_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_help_articles_category_id ON public.help_articles(category_id);
CREATE INDEX idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX idx_help_articles_is_active ON public.help_articles(is_active);
CREATE INDEX idx_help_categories_slug ON public.help_categories(slug);
CREATE INDEX idx_help_categories_is_active ON public.help_categories(is_active);

-- Revoke anon access
REVOKE ALL ON public.help_categories FROM anon;
REVOKE ALL ON public.help_articles FROM anon;

-- Insert default categories matching the UI
INSERT INTO public.help_categories (name, slug, description, icon, display_order) VALUES
('Getting Started', 'getting-started', 'Learn the basics of CaseWyze', 'Rocket', 1),
('Cases', 'cases', 'Managing cases and workflows', 'Briefcase', 2),
('Case Managers', 'case-managers', 'Assigning and managing case managers', 'Users', 3),
('Evidence & Attachments', 'evidence-attachments', 'Uploading and managing files', 'Paperclip', 4),
('Timelines & Activity Logs', 'timelines-activities', 'Tracking activities and events', 'Clock', 5),
('Budgets & Expenses', 'budgets-expenses', 'Financial tracking and management', 'DollarSign', 6),
('Reports & Exports', 'reports-exports', 'Generating and exporting reports', 'FileText', 7),
('Analytics & Dashboards', 'analytics-dashboards', 'Insights and data visualization', 'BarChart3', 8),
('Account & Organization Settings', 'account-organization', 'Configure your organization', 'Settings', 9),
('Security & Access Control', 'security-access', 'Security settings and permissions', 'Shield', 10);