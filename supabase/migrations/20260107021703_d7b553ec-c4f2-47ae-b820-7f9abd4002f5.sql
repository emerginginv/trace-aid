-- Create letter_templates table for structured letter template storage
CREATE TABLE public.letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Structured sections as JSONB
  sections JSONB NOT NULL DEFAULT '[]',
  
  -- Print configuration
  print_config JSONB NOT NULL DEFAULT '{
    "pageSize": "letter",
    "margins": {"top": "1in", "right": "1in", "bottom": "1in", "left": "1in"},
    "fontFamily": "\"Times New Roman\", Times, serif",
    "fontSize": "12pt",
    "lineHeight": 1.5,
    "avoidBreakSelectors": [".letter-signature", ".statutory-language", ".letter-recipient", "table", "ul", "ol"]
  }',
  
  -- Data bindings registry
  available_bindings JSONB NOT NULL DEFAULT '[]',
  
  -- Statutory injection config (optional)
  statutory_injection JSONB,
  
  -- Branding reference
  branding_config_id UUID,
  
  -- Metadata
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for organization lookup
CREATE INDEX idx_letter_templates_org ON public.letter_templates(organization_id);

-- Create index for category filtering
CREATE INDEX idx_letter_templates_category ON public.letter_templates(category);

-- Enable RLS
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view templates from their organization or system templates
CREATE POLICY "Users can view org and system letter templates"
  ON public.letter_templates
  FOR SELECT
  USING (
    is_system_template = true 
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create templates in their organization
CREATE POLICY "Users can create letter templates in their org"
  ON public.letter_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update templates in their organization
CREATE POLICY "Users can update letter templates in their org"
  ON public.letter_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    AND is_system_template = false
  );

-- RLS Policy: Users can delete templates in their organization
CREATE POLICY "Users can delete letter templates in their org"
  ON public.letter_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    AND is_system_template = false
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_letter_templates_updated_at
  BEFORE UPDATE ON public.letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger to auto-set organization_id
CREATE TRIGGER ensure_letter_templates_org
  BEFORE INSERT ON public.letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_organization();