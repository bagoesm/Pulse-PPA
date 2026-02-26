-- Migration: Add catatan field to surats table
-- Date: 2026-02-26

-- Add catatan column to surats table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'surats' 
        AND column_name = 'catatan'
    ) THEN
        ALTER TABLE surats ADD COLUMN catatan text;
    END IF;
END $$;
