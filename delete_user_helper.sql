-- DATA CLEANUP SCRIPT
-- Run this in your Supabase Dashboard SQL Editor to properly delete a user
-- who has created data in the system.

DO $$
DECLARE
    -- REPLACE WITH THE EMAIL OF THE USER YOU WANT TO DELETE
    target_email text := 'THE_EMAIL_TO_DELETE@example.com'; 
    
    target_user_id uuid;
BEGIN
    -- 1. Get the User ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found', target_email;
        RETURN;
    END IF;

    RAISE NOTICE 'Deleting user % (ID: %)', target_email, target_user_id;

    -- 2. Delete data from tables that strictly reference auth.users (Foreign Keys)
    -- We delete these first to avoid "update or delete on table ... violates foreign key constraint"
    
    -- Case Management
    DELETE FROM public.case_investigators WHERE investigator_id = target_user_id OR assigned_by = target_user_id;
    DELETE FROM public.case_activities WHERE user_id = target_user_id;
    DELETE FROM public.case_updates WHERE user_id = target_user_id;
    DELETE FROM public.case_attachments WHERE user_id = target_user_id;
    DELETE FROM public.subject_attachments WHERE user_id = target_user_id;
    DELETE FROM public.case_finances WHERE user_id = target_user_id;
    
    -- Core Entities (These might cascade others, but explicit delete is safer)
    DELETE FROM public.cases WHERE user_id = target_user_id;
    DELETE FROM public.accounts WHERE user_id = target_user_id;
    DELETE FROM public.contacts WHERE user_id = target_user_id;
    DELETE FROM public.invoices WHERE user_id = target_user_id;
    
    -- Invites
    DELETE FROM public.organization_invites WHERE invited_by = target_user_id;

    -- Note: public.profiles, public.user_roles, public.organization_members 
    -- usually have ON DELETE CASCADE established, but if you already deleted them manually, 
    -- that's fine. If they exist, they will be deleted automatically when auth.users is deleted.

    -- 3. Delete the User from Authentication
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RAISE NOTICE 'User deleted successfully.';
END $$;
