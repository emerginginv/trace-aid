-- Add expense_user_id column to track who the expense is for
ALTER TABLE case_finances
ADD COLUMN expense_user_id uuid REFERENCES profiles(id);

-- Add comment for clarity
COMMENT ON COLUMN case_finances.expense_user_id IS 'The user who incurred or submitted the expense (may differ from user_id who created the record)';