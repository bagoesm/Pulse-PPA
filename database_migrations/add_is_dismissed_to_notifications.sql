-- Add is_dismissed column to notifications table
-- This tracks whether user has seen the notification in the dropdown (different from is_read)

ALTER TABLE notifications 
ADD COLUMN is_dismissed BOOLEAN DEFAULT FALSE;

-- Update existing notifications to be not dismissed
UPDATE notifications 
SET is_dismissed = FALSE 
WHERE is_dismissed IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_dismissed 
ON notifications(user_id, is_dismissed);

-- Add comment for documentation
COMMENT ON COLUMN notifications.is_dismissed IS 'Whether user has seen this notification in dropdown (prevents re-showing)';