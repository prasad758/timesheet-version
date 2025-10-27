-- Create Notifications System
-- This allows users to receive notifications for various events

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('issue_assigned', 'issue_comment', 'leave_request', 'leave_approved', 'leave_rejected', 'mention', 'general')),
  link TEXT, -- URL to navigate to when notification is clicked
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  related_id UUID -- ID of related entity (issue_id, leave_request_id, etc.)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (to mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- System can create notifications for any user
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, p_related_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to notify admins about leave requests
CREATE OR REPLACE FUNCTION notify_admins_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record RECORD;
  user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  -- Notify all admins
  FOR admin_record IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    PERFORM create_notification(
      admin_record.user_id,
      'New Leave Request',
      user_email || ' has requested ' || NEW.leave_type || ' leave from ' || 
        NEW.start_date || ' to ' || NEW.end_date,
      'leave_request',
      '/leave-calendar',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify user about leave status change
CREATE OR REPLACE FUNCTION notify_user_leave_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if status changed to approved or rejected
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM create_notification(
      NEW.user_id,
      'Leave Request ' || INITCAP(NEW.status),
      'Your ' || NEW.leave_type || ' leave request from ' || NEW.start_date || 
        ' to ' || NEW.end_date || ' has been ' || NEW.status,
      'leave_' || NEW.status,
      '/leave-calendar',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify user when assigned to an issue
CREATE OR REPLACE FUNCTION notify_user_issue_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_title TEXT;
BEGIN
  -- Get issue title
  SELECT title INTO issue_title FROM issues WHERE id = NEW.issue_id;
  
  PERFORM create_notification(
    NEW.user_id,
    'Assigned to Issue',
    'You have been assigned to issue: ' || issue_title,
    'issue_assigned',
    '/issues/' || NEW.issue_id,
    NEW.issue_id::UUID
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify users about issue comments
CREATE OR REPLACE FUNCTION notify_issue_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_title TEXT;
  assignee_record RECORD;
  commenter_email TEXT;
  issue_creator UUID;
BEGIN
  -- Get issue details
  SELECT title, created_by INTO issue_title, issue_creator FROM issues WHERE id = NEW.issue_id;
  SELECT email INTO commenter_email FROM auth.users WHERE id = NEW.user_id;
  
  -- Notify all assignees (except the commenter)
  FOR assignee_record IN 
    SELECT user_id FROM issue_assignees WHERE issue_id = NEW.issue_id AND user_id != NEW.user_id
  LOOP
    PERFORM create_notification(
      assignee_record.user_id,
      'New Comment on Issue',
      commenter_email || ' commented on: ' || issue_title,
      'issue_comment',
      '/issues/' || NEW.issue_id,
      NEW.issue_id::UUID
    );
  END LOOP;
  
  -- Notify issue creator if they're not the commenter and not already notified
  IF issue_creator IS NOT NULL AND issue_creator != NEW.user_id THEN
    IF NOT EXISTS (SELECT 1 FROM issue_assignees WHERE issue_id = NEW.issue_id AND user_id = issue_creator) THEN
      PERFORM create_notification(
        issue_creator,
        'New Comment on Your Issue',
        commenter_email || ' commented on: ' || issue_title,
        'issue_comment',
        '/issues/' || NEW.issue_id,
        NEW.issue_id::UUID
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_leave_request ON leave_requests;
CREATE TRIGGER trigger_notify_leave_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admins_leave_request();

DROP TRIGGER IF EXISTS trigger_notify_leave_status ON leave_requests;
CREATE TRIGGER trigger_notify_leave_status
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_leave_status();

DROP TRIGGER IF EXISTS trigger_notify_issue_assignment ON issue_assignees;
CREATE TRIGGER trigger_notify_issue_assignment
  AFTER INSERT ON issue_assignees
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_issue_assignment();

DROP TRIGGER IF EXISTS trigger_notify_issue_comment ON issue_comments;
CREATE TRIGGER trigger_notify_issue_comment
  AFTER INSERT ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_issue_comment();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id AND read = false;
  
  RETURN unread_count;
END;
$$;

-- Verify the setup
SELECT 'Notifications system created successfully!' as message;

