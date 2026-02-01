-- Fix: Restrict user_roles SELECT policy to prevent exposure of all role assignments

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;

-- Create policy allowing users to see only their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy allowing admins to view all roles (needed for admin panel)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));