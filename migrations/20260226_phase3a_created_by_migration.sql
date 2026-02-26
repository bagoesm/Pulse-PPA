-- Phase 3A: Add created_by_id UUID columns to all tables that store created_by as text (name)
-- This is a dual-write migration: new column is added alongside existing text column
-- App code will be updated to write both columns during transition

BEGIN;

-- Step 1: Add created_by_id columns (nullable, with FK to profiles)
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.data_inventory ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.disposisi ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.disposisi ADD COLUMN IF NOT EXISTS completed_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.disposisi_history ADD COLUMN IF NOT EXISTS performed_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.project_links ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.surats ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id);

-- Step 2: Populate created_by_id from existing created_by text (name → profile id)
-- Using name matching against profiles table
UPDATE public.announcements a SET created_by_id = p.id FROM public.profiles p WHERE a.created_by = p.name AND a.created_by_id IS NULL;
UPDATE public.data_inventory d SET created_by_id = p.id FROM public.profiles p WHERE d.created_by = p.name AND d.created_by_id IS NULL;
UPDATE public.disposisi d SET created_by_id = p.id FROM public.profiles p WHERE d.created_by = p.name AND d.created_by_id IS NULL;
UPDATE public.disposisi d SET completed_by_id = p.id FROM public.profiles p WHERE d.completed_by = p.name AND d.completed_by_id IS NULL;
UPDATE public.disposisi_history h SET performed_by_id = p.id FROM public.profiles p WHERE h.performed_by = p.name AND h.performed_by_id IS NULL;
UPDATE public.epics e SET created_by_id = p.id FROM public.profiles p WHERE e.created_by = p.name AND e.created_by_id IS NULL;
UPDATE public.feedbacks f SET created_by_id = p.id FROM public.profiles p WHERE f.created_by = p.name AND f.created_by_id IS NULL;
UPDATE public.meetings m SET created_by_id = p.id FROM public.profiles p WHERE m.created_by = p.name AND m.created_by_id IS NULL;
UPDATE public.project_links l SET created_by_id = p.id FROM public.profiles p WHERE l.created_by = p.name AND l.created_by_id IS NULL;
UPDATE public.surats s SET created_by_id = p.id FROM public.profiles p WHERE s.created_by = p.name AND s.created_by_id IS NULL;

-- Also try to populate where created_by might contain a UUID already (edge cases)
UPDATE public.disposisi d SET created_by_id = d.created_by::uuid WHERE d.created_by_id IS NULL AND d.created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE public.disposisi d SET completed_by_id = d.completed_by::uuid WHERE d.completed_by_id IS NULL AND d.completed_by IS NOT NULL AND d.completed_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE public.disposisi_history h SET performed_by_id = h.performed_by::uuid WHERE h.performed_by_id IS NULL AND h.performed_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

COMMIT;
