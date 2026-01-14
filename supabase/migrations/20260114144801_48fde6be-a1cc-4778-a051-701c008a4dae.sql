-- Migrate existing subject_types data to picklists table using a default user from each organization
INSERT INTO public.picklists (organization_id, user_id, type, value, color, is_active, display_order)
SELECT 
  st.organization_id,
  COALESCE(
    st.created_by,
    (SELECT p.user_id FROM public.picklists p WHERE p.organization_id = st.organization_id LIMIT 1),
    (SELECT id FROM public.profiles LIMIT 1)
  ),
  'subject_type',
  st.name,
  COALESCE(st.color, '#6366f1'),
  st.is_active,
  st.display_order
FROM public.subject_types st
ON CONFLICT DO NOTHING;