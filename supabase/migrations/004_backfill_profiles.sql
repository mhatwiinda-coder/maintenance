-- ============================================================
-- MIGRATION 004 — Backfill missing profiles for all auth users
-- Run this ONCE in Supabase SQL Editor to fix any accounts
-- created before the trigger was working correctly.
-- ============================================================

INSERT INTO public.profiles (id, full_name, role, email)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(
    CASE
      WHEN u.raw_user_meta_data->>'role' IN ('owner','client','technician')
      THEN (u.raw_user_meta_data->>'role')::user_role
      ELSE 'client'::user_role
    END,
    'client'::user_role
  ),
  u.email
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE
  SET
    email     = EXCLUDED.email,
    full_name = CASE
                  WHEN profiles.full_name = '' OR profiles.full_name IS NULL
                  THEN EXCLUDED.full_name
                  ELSE profiles.full_name
                END;
