-- Fix: Replace the handle_new_user trigger with robust error handling
-- Run this in Supabase SQL Editor

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role;
  _full_name TEXT;
BEGIN
  -- Safely extract full_name
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Safely cast role with fallback to 'client'
  BEGIN
    _role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
    _role := 'client'::user_role;
  END;

  IF _role IS NULL THEN
    _role := 'client'::user_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, _full_name, _role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
