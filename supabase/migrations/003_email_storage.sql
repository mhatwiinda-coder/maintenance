-- ============================================================
-- MIGRATION 003 — Email column + Storage bucket for images
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add email column to profiles (so we can send status emails)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. Update trigger to also save email from auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role;
  _full_name TEXT;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  BEGIN
    _role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    _role := 'client'::user_role;
  END;

  IF _role IS NULL THEN _role := 'client'::user_role; END IF;

  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (NEW.id, _full_name, _role, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Backfill emails for existing profiles (from auth.users)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. Create Supabase Storage bucket for work order images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-order-images',
  'work-order-images',
  true,
  10485760, -- 10MB max per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS policies
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'work-order-images');

CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'work-order-images');

CREATE POLICY "Uploaders can delete their images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'work-order-images' AND auth.uid()::text = owner);
