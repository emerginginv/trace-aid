-- Create function to check if a user can view billing rates
-- Only admin and manager roles can see invoice rates and margins
CREATE OR REPLACE FUNCTION public.can_view_billing_rates(p_user_id UUID DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN has_role(p_user_id, 'admin'::app_role) 
    OR has_role(p_user_id, 'manager'::app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_view_billing_rates(UUID) TO authenticated;