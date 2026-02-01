-- Create function to validate email domain
CREATE OR REPLACE FUNCTION public.validate_onestep_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email NOT LIKE '%@onestep.co' THEN
    RAISE EXCEPTION 'Only @onestep.co email addresses are allowed';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table to enforce email domain
CREATE TRIGGER enforce_onestep_email_on_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_onestep_email();