-- Fix: The two RESTRICTIVE SELECT policies require BOTH to pass (AND logic)
-- We need PERMISSIVE policies so EITHER condition can grant access (OR logic)

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create PERMISSIVE policies (default) - user can see own roles OR admin can see all
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));