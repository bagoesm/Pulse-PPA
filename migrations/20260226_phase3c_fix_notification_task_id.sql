-- Phase 3C: Change notifications.task_id from text to uuid
-- Also update the create_notification RPC function parameter type

BEGIN;

-- Step 1: Clean up any empty string task_ids (convert to NULL)
UPDATE public.notifications SET task_id = NULL WHERE task_id = '' OR task_id IS NOT NULL AND task_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 2: Change column type from text to uuid
ALTER TABLE public.notifications ALTER COLUMN task_id TYPE uuid USING task_id::uuid;

-- Step 3: Add FK constraint (task_id references tasks.id)
ALTER TABLE public.notifications ADD CONSTRAINT notifications_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Step 4: Update the create_notification RPC function with correct parameter types
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type varchar,
  p_title varchar,
  p_message text,
  p_task_id uuid DEFAULT NULL,
  p_task_title varchar DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL,
  p_meeting_title varchar DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, task_id, task_title, meeting_id, meeting_title)
  VALUES (p_user_id, p_type, p_title, p_message, p_task_id, p_task_title, p_meeting_id, p_meeting_title)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
