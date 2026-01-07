-- Add conditional injection fields to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS fee_waiver boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expedited boolean DEFAULT false;

COMMENT ON COLUMN cases.fee_waiver IS 'Whether to include fee waiver section when generating documents';
COMMENT ON COLUMN cases.expedited IS 'Whether to include expedited processing section when generating documents';