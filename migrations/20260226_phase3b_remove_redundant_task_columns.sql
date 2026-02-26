-- Phase 3B: Populate category_id / sub_category_id from existing text columns in tasks
-- Then drop the redundant text columns

BEGIN;

-- Step 1: Populate category_id from existing category text
-- Match by name against master_categories table
UPDATE public.tasks t
SET category_id = mc.id
FROM public.master_categories mc
WHERE t.category = mc.name
  AND t.category_id IS NULL
  AND t.category IS NOT NULL
  AND t.category != '';

-- Step 2: Populate sub_category_id from existing sub_category text
-- Match by name against master_sub_categories table
UPDATE public.tasks t
SET sub_category_id = msc.id
FROM public.master_sub_categories msc
WHERE t.sub_category = msc.name
  AND t.sub_category_id IS NULL
  AND t.sub_category IS NOT NULL
  AND t.sub_category != '';

-- Step 3: Drop the redundant text columns
ALTER TABLE public.tasks DROP COLUMN IF EXISTS category;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS sub_category;

COMMIT;
