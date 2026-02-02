-- Update can_edit_stops function to include product_manager
CREATE OR REPLACE FUNCTION public.can_edit_stops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'dev', 'qa', 'product_manager')
  )
$$;