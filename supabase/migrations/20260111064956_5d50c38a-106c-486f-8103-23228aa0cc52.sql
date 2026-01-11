-- Create entity_activities table for tracking account/contact interactions
CREATE TABLE public.entity_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account', 'contact')),
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_entity_activities_entity ON public.entity_activities(entity_type, entity_id);
CREATE INDEX idx_entity_activities_org ON public.entity_activities(organization_id);

-- Enable RLS
ALTER TABLE public.entity_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entity_activities
CREATE POLICY "Org members can view entity activities"
ON public.entity_activities FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create entity activities"
ON public.entity_activities FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id) AND user_id = auth.uid());

CREATE POLICY "Org members can update entity activities"
ON public.entity_activities FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete entity activities"
ON public.entity_activities FOR DELETE
USING (is_org_member(auth.uid(), organization_id));

-- Create entity_activity_photos table
CREATE TABLE public.entity_activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.entity_activities(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_entity_activity_photos_activity ON public.entity_activity_photos(activity_id);

-- Enable RLS
ALTER TABLE public.entity_activity_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entity_activity_photos
CREATE POLICY "Org members can view entity activity photos"
ON public.entity_activity_photos FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can upload entity activity photos"
ON public.entity_activity_photos FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id) AND uploaded_by = auth.uid());

CREATE POLICY "Org members can delete entity activity photos"
ON public.entity_activity_photos FOR DELETE
USING (is_org_member(auth.uid(), organization_id));

-- Create storage bucket for entity activity photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entity-activity-photos',
  'entity-activity-photos',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS policies
CREATE POLICY "Org members can upload entity activity photos storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entity-activity-photos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Org members can view entity activity photos storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entity-activity-photos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Org members can delete entity activity photos storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entity-activity-photos' 
  AND auth.uid() IS NOT NULL
);

-- Create trigger for updated_at
CREATE TRIGGER update_entity_activities_updated_at
BEFORE UPDATE ON public.entity_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();