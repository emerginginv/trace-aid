-- Add case-level content fields for AI-assisted drafting
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS fee_waiver_justification text,
ADD COLUMN IF NOT EXISTS expedited_justification text,
ADD COLUMN IF NOT EXISTS purpose_of_request text;

COMMENT ON COLUMN cases.fee_waiver_justification IS 'AI-assisted or user-written fee waiver justification for document generation';
COMMENT ON COLUMN cases.expedited_justification IS 'AI-assisted or user-written expedited processing justification';
COMMENT ON COLUMN cases.purpose_of_request IS 'Purpose explanation for public records requests';