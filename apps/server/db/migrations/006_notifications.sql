-- Notifications System Migration
-- Creates notifications table for user notifications
-- 
-- This migration:
-- 1. Creates notifications table
-- 2. Sets up indexes for performance
-- 3. Creates RLS policies
-- 4. Adds helper functions

BEGIN;

-- ===============================================
-- 1. Create notifications table
-- ===============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('event_created', 'event_updated', 'event_cancelled', 'join_request', 'join_approved', 'join_declined')),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    payload jsonb NOT NULL DEFAULT '{}',
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===============================================
-- 2. Create indexes
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, read_at) 
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_event_id 
ON public.notifications (event_id);

-- ===============================================
-- 3. Create updated_at trigger
-- ===============================================
CREATE TRIGGER set_timestamp_notifications
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ===============================================
-- 4. Create RLS policies
-- ===============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ===============================================
-- 5. Create function to clean up old notifications
-- ===============================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE sql
AS $$
    WITH deleted AS (
        DELETE FROM public.notifications 
        WHERE created_at < now() - (days_to_keep || ' days')::interval
        RETURNING 1
    )
    SELECT COUNT(*) FROM deleted;
$$;

-- ===============================================
-- 6. Add helpful comments
-- ===============================================
COMMENT ON TABLE public.notifications IS 'User notifications for events and activities';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification (event_created, join_request, etc.)';
COMMENT ON COLUMN public.notifications.payload IS 'JSON payload with notification-specific data';
COMMENT ON COLUMN public.notifications.read_at IS 'When the notification was read (NULL = unread)';

COMMENT ON FUNCTION cleanup_old_notifications(integer) 
IS 'Clean up notifications older than specified days';

COMMIT;
