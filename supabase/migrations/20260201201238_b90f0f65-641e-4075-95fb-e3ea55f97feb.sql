-- Fix: Replace overly permissive UPDATE policy with a proper one
-- Only allow updates to mark tokens as used (service role will handle this via edge function)
DROP POLICY IF EXISTS "Service can update tokens" ON public.login_tokens;

-- Only admins can update their own created tokens
CREATE POLICY "Admins can update login tokens"
  ON public.login_tokens FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));