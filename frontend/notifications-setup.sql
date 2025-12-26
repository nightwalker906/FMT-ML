-- ============================================================================
-- NOTIFICATIONS TABLE SETUP
-- ============================================================================
-- Run these SQL commands in Supabase SQL Editor
-- This creates a notifications table for in-app notifications
-- ============================================================================

-- STEP 1: Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 'booking_request', 'booking_accepted', 'booking_cancelled', 'message', 'review', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),  -- Optional URL to navigate to when clicked
  metadata JSONB DEFAULT '{}',  -- Store extra data like booking_id, sender_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ============================================================================
-- STEP 2: Enable RLS on Notifications Table
-- ============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Allow system/server to insert notifications (service role)
-- For normal users, notifications are created via triggers or server functions
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- STEP 3: Create Helper Functions
-- ============================================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_action_url VARCHAR(500) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = false;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;

-- ============================================================================
-- STEP 5: Create Triggers for Automatic Notifications (Optional)
-- ============================================================================

-- Trigger: Notify tutor when a new booking is created
CREATE OR REPLACE FUNCTION notify_on_booking_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Get student name
  PERFORM create_notification(
    NEW.tutor_id,
    'booking_request',
    'New Booking Request',
    'You have a new booking request for ' || NEW.subject,
    '/tutor/requests',
    jsonb_build_object('booking_id', NEW.id, 'student_id', NEW.student_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bookings table (if it exists)
DROP TRIGGER IF EXISTS trigger_notify_booking_created ON public.bookings;
CREATE TRIGGER trigger_notify_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_created();

-- Trigger: Notify student when booking status changes
CREATE OR REPLACE FUNCTION notify_on_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    IF NEW.status = 'accepted' THEN
      PERFORM create_notification(
        NEW.student_id,
        'booking_accepted',
        'Booking Accepted!',
        'Your booking request for ' || NEW.subject || ' has been accepted',
        '/student/schedule',
        jsonb_build_object('booking_id', NEW.id, 'tutor_id', NEW.tutor_id)
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.student_id,
        'booking_rejected',
        'Booking Declined',
        'Your booking request for ' || NEW.subject || ' was declined',
        '/student/search',
        jsonb_build_object('booking_id', NEW.id, 'tutor_id', NEW.tutor_id)
      );
    ELSIF NEW.status = 'cancelled' THEN
      -- Notify both parties
      PERFORM create_notification(
        NEW.student_id,
        'booking_cancelled',
        'Booking Cancelled',
        'A booking for ' || NEW.subject || ' has been cancelled',
        '/student/schedule',
        jsonb_build_object('booking_id', NEW.id)
      );
      PERFORM create_notification(
        NEW.tutor_id,
        'booking_cancelled',
        'Booking Cancelled',
        'A booking for ' || NEW.subject || ' has been cancelled',
        '/tutor/requests',
        jsonb_build_object('booking_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_booking_status_change ON public.bookings;
CREATE TRIGGER trigger_notify_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_status_change();

-- ============================================================================
-- STEP 6: Insert Sample Notifications (for testing)
-- ============================================================================

-- Uncomment and modify with actual user IDs to test
/*
INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
VALUES 
  ('YOUR_USER_ID', 'booking_request', 'New Booking Request', 'John Doe wants to book a Math session', '/tutor/requests', '{"booking_id": "123"}'),
  ('YOUR_USER_ID', 'message', 'New Message', 'Sarah sent you a message', '/student/messages', '{"sender_id": "456"}'),
  ('YOUR_USER_ID', 'system', 'Welcome!', 'Welcome to Find My Tutor. Start by completing your profile.', '/student/settings', '{}');
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Created 'notifications' table with proper schema
-- ✅ Added RLS policies for security
-- ✅ Created helper functions (create_notification, mark_all_read, get_unread_count)
-- ✅ Added triggers for automatic notifications on booking events
-- ============================================================================
