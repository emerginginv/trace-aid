-- Enable realtime for organizations table to sync subscription status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;