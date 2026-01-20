-- Create invoice_payments table to track payments
CREATE TABLE public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.case_finances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for invoice_payments
CREATE POLICY "Users can manage own invoice payments"
ON public.invoice_payments
FOR ALL
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_invoice_payments_updated_at
BEFORE UPDATE ON public.invoice_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add index for better query performance
CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_user_id ON public.invoice_payments(user_id);

-- Add due_date column to case_finances if it doesn't exist (for invoices)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'case_finances' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.case_finances ADD COLUMN due_date DATE;
  END IF;
END $$;