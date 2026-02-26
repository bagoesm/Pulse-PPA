-- ============================================================================
-- Fix profiles INSERT policy to allow Admins to create other users
-- Date: 2026-02-26
-- Description: The existing `insert_profiles` policy strictly required `id = auth.uid()`.
--              When an Admin creates a new user, they are authenticated as themselves,
--              so inserting a profile with the new user's ID fails.
--              This fix allows inserting profiles if the id matches auth.uid() OR
--              if the executing user's role is 'Super Admin'.
-- ============================================================================

DROP POLICY IF EXISTS "insert_profiles" ON public.profiles;

CREATE POLICY "insert_profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin')
    )
  );

DROP POLICY IF EXISTS "update_profiles" ON public.profiles;

CREATE POLICY "update_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin')
    )
  );

