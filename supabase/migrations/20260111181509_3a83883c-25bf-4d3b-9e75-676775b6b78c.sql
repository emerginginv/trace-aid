-- Update get_plan_key_from_product function with correct LIVE product IDs
CREATE OR REPLACE FUNCTION public.get_plan_key_from_product(product_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $$
  SELECT CASE
    WHEN product_id = 'prod_Tm0ev0X9L9DbJi' THEN 'solo'
    WHEN product_id = 'prod_Tm0em6GqFzUGEt' THEN 'team'
    WHEN product_id = 'prod_Tm0eUMnuJ4978P' THEN 'enterprise'
    ELSE 'solo'
  END;
$$;