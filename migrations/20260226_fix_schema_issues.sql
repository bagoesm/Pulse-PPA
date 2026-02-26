-- ============================================================================
-- Phase 1: Schema Fixes (No App Code Changes Required)
-- Date: 2026-02-26
-- Description: Fix duplicate FKs, add missing FKs, clean up unused columns,
--              fix data types, and standardize UUID generation.
-- ============================================================================

-- ============================================================================
-- 1. Drop duplicate FK on surats.meeting_id
--    Two identical FKs exist: fk_surats_meeting and surats_meeting_id_fkey
-- ============================================================================
ALTER TABLE public.surats DROP CONSTRAINT IF EXISTS fk_surats_meeting;

-- ============================================================================
-- 2. Add missing FK on tasks.category_id → master_categories(id)
--    sub_category_id had FK but category_id did not
-- ============================================================================
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.master_categories(id);

-- ============================================================================
-- 3. Add missing FK on master_sub_categories.category_id → master_categories(id)
-- ============================================================================
ALTER TABLE public.master_sub_categories
  ADD CONSTRAINT master_sub_categories_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.master_categories(id);

-- ============================================================================
-- 4. Add missing FK on task_activities.user_id → profiles(id)
-- ============================================================================
ALTER TABLE public.task_activities
  ADD CONSTRAINT task_activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- ============================================================================
-- 5. Fix meeting_comments.user_id FK target
--    Was: auth.users(id)  →  Now: profiles(id) (consistent with task_comments)
-- ============================================================================
ALTER TABLE public.meeting_comments DROP CONSTRAINT IF EXISTS meeting_comments_user_id_fkey;
ALTER TABLE public.meeting_comments
  ADD CONSTRAINT meeting_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- ============================================================================
-- 6. Drop unused tasks.checklist column (app only uses checklists)
-- ============================================================================
ALTER TABLE public.tasks DROP COLUMN IF EXISTS checklist;

-- ============================================================================
-- 7. Add created_at to document_templates (every other table has it)
-- ============================================================================
ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ============================================================================
-- 8. Fix document_templates.download_count type (numeric → integer)
-- ============================================================================
ALTER TABLE public.document_templates
  ALTER COLUMN download_count TYPE integer USING download_count::integer;

-- ============================================================================
-- 9. Standardize UUID generation to gen_random_uuid()
--    These tables used uuid_generate_v4() which requires uuid-ossp extension
-- ============================================================================
ALTER TABLE public.disposisi ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.disposisi_history ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.epics ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.project_links ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================================
-- 10. Add missing FK on notifications.meeting_id → meetings(id)
-- ============================================================================
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_meeting_id_fkey
  FOREIGN KEY (meeting_id) REFERENCES public.meetings(id);
