-- ============================================================================
-- Phase 2: RLS Policy Fixes
-- Date: 2026-02-26
-- Description: Fix broken/duplicate policies, add missing RLS for 4 tables,
--              tighten overly permissive access, standardize role targeting.
-- ============================================================================

-- ============================================================================
-- 1. Clean up duplicate/broken meetings policies
--    meetings_delete_policy and meetings_update_policy compare
--    auth.uid()::text against created_by (a display name) → always false
--    meetings_select_policy is a duplicate of Meetings Select Policy
-- ============================================================================
DROP POLICY IF EXISTS "meetings_delete_policy" ON public.meetings;
DROP POLICY IF EXISTS "meetings_update_policy" ON public.meetings;
DROP POLICY IF EXISTS "meetings_select_policy" ON public.meetings;

-- ============================================================================
-- 2. Fix feedbacks UPDATE — prevent ownership theft
--    Old: USING(true) WITH CHECK(owner_or_admin) → attacker can change
--    created_by to their name, passing the with_check
--    New: USING(owner_or_admin) WITH CHECK(owner_or_admin)
-- ============================================================================
DROP POLICY IF EXISTS "update_feedbacks" ON public.feedbacks;
CREATE POLICY "update_feedbacks" ON public.feedbacks
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT profiles.name FROM profiles WHERE profiles.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Super Admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT profiles.name FROM profiles WHERE profiles.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Super Admin'
    )
  );

-- ============================================================================
-- 3. Add RLS policies for disposisi
-- ============================================================================
ALTER TABLE public.disposisi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_disposisi" ON public.disposisi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_disposisi" ON public.disposisi
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_disposisi" ON public.disposisi
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

CREATE POLICY "delete_disposisi" ON public.disposisi
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

-- ============================================================================
-- 4. Add RLS policies for disposisi_history (audit log: read + insert only)
-- ============================================================================
ALTER TABLE public.disposisi_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_disposisi_history" ON public.disposisi_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_disposisi_history" ON public.disposisi_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. Add RLS policies for epics
-- ============================================================================
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_epics" ON public.epics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_epics" ON public.epics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_epics" ON public.epics
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR (SELECT name FROM profiles WHERE id = auth.uid()) = ANY(pic)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

CREATE POLICY "delete_epics" ON public.epics
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

-- ============================================================================
-- 6. Add RLS policies for project_links
-- ============================================================================
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_project_links" ON public.project_links
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_project_links" ON public.project_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_project_links" ON public.project_links
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

CREATE POLICY "delete_project_links" ON public.project_links
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

-- ============================================================================
-- 7. Fix surats policies — add ownership/role checks
--    Old: any authenticated user can DELETE/UPDATE any surat
--    New: only creator + Super Admin + Atasan
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete surats" ON public.surats;
DROP POLICY IF EXISTS "Users can update surats" ON public.surats;
DROP POLICY IF EXISTS "Users can insert surats" ON public.surats;
DROP POLICY IF EXISTS "Users can view all surats" ON public.surats;

CREATE POLICY "select_surats" ON public.surats
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_surats" ON public.surats
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_surats" ON public.surats
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

CREATE POLICY "delete_surats" ON public.surats
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

-- ============================================================================
-- 8. Fix projects UPDATE — add role/ownership check
--    Old: any authenticated user can update any project
--    New: only project manager + Super Admin + Atasan
-- ============================================================================
DROP POLICY IF EXISTS "update_projects" ON public.projects;
CREATE POLICY "update_projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    manager = (SELECT name FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')
    )
  );

-- ============================================================================
-- 9. Standardize master data policies — restrict mutations to Super Admin
--    These 6 tables previously allowed any authenticated user full CRUD
-- ============================================================================

-- --- master_bidang_tugas ---
DROP POLICY IF EXISTS "master_bidang_tugas_delete_policy" ON public.master_bidang_tugas;
DROP POLICY IF EXISTS "master_bidang_tugas_insert_policy" ON public.master_bidang_tugas;
DROP POLICY IF EXISTS "master_bidang_tugas_select_policy" ON public.master_bidang_tugas;
DROP POLICY IF EXISTS "master_bidang_tugas_update_policy" ON public.master_bidang_tugas;

CREATE POLICY "select_master_bidang_tugas" ON public.master_bidang_tugas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_master_bidang_tugas" ON public.master_bidang_tugas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "update_master_bidang_tugas" ON public.master_bidang_tugas
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "delete_master_bidang_tugas" ON public.master_bidang_tugas
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

-- --- master_jenis_naskah ---
DROP POLICY IF EXISTS "master_jenis_naskah_delete_policy" ON public.master_jenis_naskah;
DROP POLICY IF EXISTS "master_jenis_naskah_insert_policy" ON public.master_jenis_naskah;
DROP POLICY IF EXISTS "master_jenis_naskah_select_policy" ON public.master_jenis_naskah;
DROP POLICY IF EXISTS "master_jenis_naskah_update_policy" ON public.master_jenis_naskah;

CREATE POLICY "select_master_jenis_naskah" ON public.master_jenis_naskah
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_master_jenis_naskah" ON public.master_jenis_naskah
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "update_master_jenis_naskah" ON public.master_jenis_naskah
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "delete_master_jenis_naskah" ON public.master_jenis_naskah
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

-- --- master_klasifikasi_surat ---
DROP POLICY IF EXISTS "master_klasifikasi_surat_delete_policy" ON public.master_klasifikasi_surat;
DROP POLICY IF EXISTS "master_klasifikasi_surat_insert_policy" ON public.master_klasifikasi_surat;
DROP POLICY IF EXISTS "master_klasifikasi_surat_select_policy" ON public.master_klasifikasi_surat;
DROP POLICY IF EXISTS "master_klasifikasi_surat_update_policy" ON public.master_klasifikasi_surat;

CREATE POLICY "select_master_klasifikasi_surat" ON public.master_klasifikasi_surat
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_master_klasifikasi_surat" ON public.master_klasifikasi_surat
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "update_master_klasifikasi_surat" ON public.master_klasifikasi_surat
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "delete_master_klasifikasi_surat" ON public.master_klasifikasi_surat
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

-- --- master_sifat_surat ---
DROP POLICY IF EXISTS "master_sifat_surat_delete_policy" ON public.master_sifat_surat;
DROP POLICY IF EXISTS "master_sifat_surat_insert_policy" ON public.master_sifat_surat;
DROP POLICY IF EXISTS "master_sifat_surat_select_policy" ON public.master_sifat_surat;
DROP POLICY IF EXISTS "master_sifat_surat_update_policy" ON public.master_sifat_surat;

CREATE POLICY "select_master_sifat_surat" ON public.master_sifat_surat
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_master_sifat_surat" ON public.master_sifat_surat
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "update_master_sifat_surat" ON public.master_sifat_surat
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "delete_master_sifat_surat" ON public.master_sifat_surat
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

-- --- master_unit_eksternal ---
DROP POLICY IF EXISTS "master_unit_eksternal_delete_policy" ON public.master_unit_eksternal;
DROP POLICY IF EXISTS "master_unit_eksternal_insert_policy" ON public.master_unit_eksternal;
DROP POLICY IF EXISTS "master_unit_eksternal_select_policy" ON public.master_unit_eksternal;
DROP POLICY IF EXISTS "master_unit_eksternal_update_policy" ON public.master_unit_eksternal;

CREATE POLICY "select_master_unit_eksternal" ON public.master_unit_eksternal
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_master_unit_eksternal" ON public.master_unit_eksternal
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "update_master_unit_eksternal" ON public.master_unit_eksternal
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "delete_master_unit_eksternal" ON public.master_unit_eksternal
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

-- --- master_unit_internal ---
DROP POLICY IF EXISTS "master_unit_internal_delete_policy" ON public.master_unit_internal;
DROP POLICY IF EXISTS "master_unit_internal_insert_policy" ON public.master_unit_internal;
DROP POLICY IF EXISTS "master_unit_internal_select_policy" ON public.master_unit_internal;
DROP POLICY IF EXISTS "master_unit_internal_update_policy" ON public.master_unit_internal;

CREATE POLICY "select_master_unit_internal" ON public.master_unit_internal
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_master_unit_internal" ON public.master_unit_internal
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "update_master_unit_internal" ON public.master_unit_internal
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));
CREATE POLICY "delete_master_unit_internal" ON public.master_unit_internal
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

-- ============================================================================
-- 10. Fix profiles INSERT — enforce id = auth.uid()
--     Old: only checks auth.uid() IS NOT NULL → user could insert with
--     another user's UUID as the id
-- ============================================================================
DROP POLICY IF EXISTS "insert_profiles" ON public.profiles;
CREATE POLICY "insert_profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- 11. Standardize activity_logs INSERT policy role targeting
--     Was: roles={public} with auth.role()='authenticated' check
--     Now: roles={authenticated} (cleaner Supabase pattern)
-- ============================================================================
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
