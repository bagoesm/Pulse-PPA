-- ============================================================================
-- Phase 4: Update RLS Policies to use UUID (created_by_id)
-- Description: Switches all policies from matching created_by (text name) 
--              to created_by_id (UUID) for better security and performance.
-- ============================================================================

BEGIN;

-- 1. announcements
DROP POLICY IF EXISTS "delete_announcements" ON public.announcements;
CREATE POLICY "delete_announcements" ON public.announcements FOR DELETE TO authenticated
  USING (created_by_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

DROP POLICY IF EXISTS "update_announcements" ON public.announcements;
CREATE POLICY "update_announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (created_by_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));


-- 2. data_inventory
DROP POLICY IF EXISTS "delete_data_inventory" ON public.data_inventory;
CREATE POLICY "delete_data_inventory" ON public.data_inventory FOR DELETE TO authenticated
  USING (created_by_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')));

DROP POLICY IF EXISTS "update_data_inventory" ON public.data_inventory;
CREATE POLICY "update_data_inventory" ON public.data_inventory FOR UPDATE TO authenticated
  USING (created_by_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan')));


-- 3. feedbacks
DROP POLICY IF EXISTS "delete_feedbacks" ON public.feedbacks;
CREATE POLICY "delete_feedbacks" ON public.feedbacks FOR DELETE TO authenticated
  USING (created_by_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

DROP POLICY IF EXISTS "update_feedbacks" ON public.feedbacks;
CREATE POLICY "update_feedbacks" ON public.feedbacks FOR UPDATE TO authenticated
  USING (created_by_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'))
  WITH CHECK (created_by_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));


-- 4. meetings (delete + update)
DROP POLICY IF EXISTS "Enable delete for meeting owners and super admin" ON public.meetings;
DROP POLICY IF EXISTS "delete_meetings" ON public.meetings;
CREATE POLICY "delete_meetings" ON public.meetings FOR DELETE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR ((inviter ->> 'id')::uuid = auth.uid())
    OR (SELECT name FROM profiles WHERE id = auth.uid()) = ANY(pic)
  );

DROP POLICY IF EXISTS "Meetings Update Policy" ON public.meetings;
DROP POLICY IF EXISTS "update_meetings" ON public.meetings;
CREATE POLICY "update_meetings" ON public.meetings FOR UPDATE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
    OR (SELECT name FROM profiles WHERE id = auth.uid()) = ANY(pic)
  )
  WITH CHECK (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
    OR (SELECT name FROM profiles WHERE id = auth.uid()) = ANY(pic)
  );


-- 5. disposisi
DROP POLICY IF EXISTS "update_disposisi" ON public.disposisi;
CREATE POLICY "update_disposisi" ON public.disposisi FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );

DROP POLICY IF EXISTS "delete_disposisi" ON public.disposisi;
CREATE POLICY "delete_disposisi" ON public.disposisi FOR DELETE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );


-- 6. epics
DROP POLICY IF EXISTS "update_epics" ON public.epics;
CREATE POLICY "update_epics" ON public.epics FOR UPDATE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR (SELECT name FROM profiles WHERE id = auth.uid()) = ANY(pic)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );

DROP POLICY IF EXISTS "delete_epics" ON public.epics;
CREATE POLICY "delete_epics" ON public.epics FOR DELETE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );


-- 7. project_links
DROP POLICY IF EXISTS "update_project_links" ON public.project_links;
CREATE POLICY "update_project_links" ON public.project_links FOR UPDATE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );

DROP POLICY IF EXISTS "delete_project_links" ON public.project_links;
CREATE POLICY "delete_project_links" ON public.project_links FOR DELETE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );


-- 8. surats
DROP POLICY IF EXISTS "update_surats" ON public.surats;
CREATE POLICY "update_surats" ON public.surats FOR UPDATE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );

DROP POLICY IF EXISTS "delete_surats" ON public.surats;
CREATE POLICY "delete_surats" ON public.surats FOR DELETE TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Atasan'))
  );

COMMIT;
