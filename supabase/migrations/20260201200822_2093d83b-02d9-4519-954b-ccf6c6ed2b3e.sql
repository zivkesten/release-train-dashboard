-- Create table for temporary login tokens
CREATE TABLE public.login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone DEFAULT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can create tokens
CREATE POLICY "Admins can insert login tokens"
  ON public.login_tokens FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can view tokens
CREATE POLICY "Admins can view login tokens"
  ON public.login_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Service role can update tokens (for marking as used)
CREATE POLICY "Service can update tokens"
  ON public.login_tokens FOR UPDATE
  TO authenticated
  USING (true);

-- Admins can delete tokens
CREATE POLICY "Admins can delete login tokens"
  ON public.login_tokens FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create index for fast token lookup
CREATE INDEX idx_login_tokens_token ON public.login_tokens(token);