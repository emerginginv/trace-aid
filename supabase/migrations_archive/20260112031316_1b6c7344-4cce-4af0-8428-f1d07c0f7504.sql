-- First, drop the overly permissive admin policy that allows cross-organization access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- The "Users can view profiles in their organization" policy is actually needed
-- for assigning case managers, investigators, and viewing team members.
-- However, let's ensure we have proper policies in place:

-- Keep the self-access policies (already exist):
-- "Users can view own profile" - (auth.uid() = id)
-- "Users can insert own profile" - (auth.uid() = id)
-- "Users can update own profile" - (auth.uid() = id)

-- The organization-level visibility is required for:
-- 1. Assigning case managers and investigators
-- 2. Viewing team members for collaboration
-- 3. Admin management of organization members

-- This is a legitimate business requirement and is properly scoped to the organization.
-- The main fix was removing "Admins can view all profiles" which allowed cross-org access.