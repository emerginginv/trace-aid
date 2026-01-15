-- Fix: Reserved Subdomains Public Exposure
-- Remove public read access from reserved_subdomains table
-- The SECURITY DEFINER function check_subdomain_availability can still access the table

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view reserved subdomains" ON reserved_subdomains;

-- Create policy allowing only platform staff to view reserved subdomains
CREATE POLICY "Platform staff can view reserved subdomains"
ON reserved_subdomains FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid() AND ps.is_active = true
  )
);

-- Note: The check_subdomain_availability function is SECURITY DEFINER
-- which means it runs with the privileges of the function owner (postgres),
-- bypassing RLS and allowing public subdomain availability checks
-- without exposing the full table contents