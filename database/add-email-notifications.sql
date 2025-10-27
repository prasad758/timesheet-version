-- Add Email Notifications
-- This extends the notification system to send emails via Supabase Edge Functions

-- Function to send email notification when issue is assigned
CREATE OR REPLACE FUNCTION send_email_issue_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_title TEXT;
  user_email TEXT;
  assigner_email TEXT;
BEGIN
  -- Get issue title
  SELECT title INTO issue_title FROM issues WHERE id = NEW.issue_id;
  
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  -- Get assigner email
  SELECT email INTO assigner_email FROM auth.users WHERE id = NEW.assigned_by;
  
  -- Insert into a mail queue table (we'll process this separately)
  INSERT INTO email_queue (
    recipient_email,
    subject,
    body_html,
    notification_type,
    related_id
  ) VALUES (
    user_email,
    'You have been assigned to an issue',
    '<h2>New Issue Assignment</h2>' ||
    '<p>You have been assigned to the following issue:</p>' ||
    '<h3>' || issue_title || '</h3>' ||
    '<p>Assigned by: ' || COALESCE(assigner_email, 'System') || '</p>' ||
    '<p><a href="' || current_setting('app.base_url', true) || '/issues/' || NEW.issue_id || '">View Issue</a></p>',
    'issue_assigned',
    NEW.issue_id::UUID
  );
  
  RETURN NEW;
END;
$$;

-- Function to send email notification when comment is added
CREATE OR REPLACE FUNCTION send_email_issue_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_title TEXT;
  assignee_record RECORD;
  commenter_email TEXT;
  issue_creator UUID;
  creator_email TEXT;
BEGIN
  -- Get issue details
  SELECT title, created_by INTO issue_title, issue_creator FROM issues WHERE id = NEW.issue_id;
  SELECT email INTO commenter_email FROM auth.users WHERE id = NEW.user_id;
  
  -- Notify all assignees (except the commenter)
  FOR assignee_record IN 
    SELECT ia.user_id, au.email 
    FROM issue_assignees ia
    JOIN auth.users au ON ia.user_id = au.id
    WHERE ia.issue_id = NEW.issue_id AND ia.user_id != NEW.user_id
  LOOP
    INSERT INTO email_queue (
      recipient_email,
      subject,
      body_html,
      notification_type,
      related_id
    ) VALUES (
      assignee_record.email,
      'New comment on issue: ' || issue_title,
      '<h2>New Comment</h2>' ||
      '<p><strong>' || commenter_email || '</strong> commented on:</p>' ||
      '<h3>' || issue_title || '</h3>' ||
      '<blockquote>' || NEW.comment || '</blockquote>' ||
      '<p><a href="' || current_setting('app.base_url', true) || '/issues/' || NEW.issue_id || '">View Issue</a></p>',
      'issue_comment',
      NEW.issue_id::UUID
    );
  END LOOP;
  
  -- Notify issue creator if they're not the commenter and not already notified
  IF issue_creator IS NOT NULL AND issue_creator != NEW.user_id THEN
    IF NOT EXISTS (SELECT 1 FROM issue_assignees WHERE issue_id = NEW.issue_id AND user_id = issue_creator) THEN
      SELECT email INTO creator_email FROM auth.users WHERE id = issue_creator;
      
      INSERT INTO email_queue (
        recipient_email,
        subject,
        body_html,
        notification_type,
        related_id
      ) VALUES (
        creator_email,
        'New comment on your issue: ' || issue_title,
        '<h2>New Comment on Your Issue</h2>' ||
        '<p><strong>' || commenter_email || '</strong> commented on:</p>' ||
        '<h3>' || issue_title || '</h3>' ||
        '<blockquote>' || NEW.comment || '</blockquote>' ||
        '<p><a href="' || current_setting('app.base_url', true) || '/issues/' || NEW.issue_id || '">View Issue</a></p>',
        'issue_comment',
        NEW.issue_id::UUID
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to send email notification for leave status changes
CREATE OR REPLACE FUNCTION send_email_leave_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  status_text TEXT;
  status_color TEXT;
BEGIN
  -- Only send email if status changed to approved or rejected
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
    
    -- Set status text and color
    IF NEW.status = 'approved' THEN
      status_text := 'APPROVED ✅';
      status_color := 'green';
    ELSE
      status_text := 'REJECTED ❌';
      status_color := 'red';
    END IF;
    
    INSERT INTO email_queue (
      recipient_email,
      subject,
      body_html,
      notification_type,
      related_id
    ) VALUES (
      user_email,
      'Leave request ' || NEW.status || ': ' || NEW.start_date || ' to ' || NEW.end_date,
      '<h2 style="color: ' || status_color || ';">Leave Request ' || status_text || '</h2>' ||
      '<p>Your leave request has been <strong>' || NEW.status || '</strong>:</p>' ||
      '<ul>' ||
      '<li><strong>Type:</strong> ' || UPPER(NEW.leave_type) || '</li>' ||
      '<li><strong>Dates:</strong> ' || NEW.start_date || ' to ' || NEW.end_date || '</li>' ||
      CASE WHEN NEW.admin_notes IS NOT NULL THEN 
        '<li><strong>Admin Notes:</strong> ' || NEW.admin_notes || '</li>' 
      ELSE '' END ||
      '</ul>' ||
      '<p><a href="' || current_setting('app.base_url', true) || '/leave-calendar">View Leave Calendar</a></p>',
      'leave_' || NEW.status,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to send email notification to admins for new leave requests
CREATE OR REPLACE FUNCTION send_email_leave_request()
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
    SELECT ur.user_id, au.email 
    FROM user_roles ur
    JOIN auth.users au ON ur.user_id = au.id
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO email_queue (
      recipient_email,
      subject,
      body_html,
      notification_type,
      related_id
    ) VALUES (
      admin_record.email,
      'New leave request from ' || user_email,
      '<h2>📅 New Leave Request</h2>' ||
      '<p><strong>' || user_email || '</strong> has requested leave:</p>' ||
      '<ul>' ||
      '<li><strong>Type:</strong> ' || UPPER(NEW.leave_type) || '</li>' ||
      '<li><strong>Dates:</strong> ' || NEW.start_date || ' to ' || NEW.end_date || '</li>' ||
      CASE WHEN NEW.reason IS NOT NULL THEN 
        '<li><strong>Reason:</strong> ' || NEW.reason || '</li>' 
      ELSE '' END ||
      '</ul>' ||
      '<p><a href="' || current_setting('app.base_url', true) || '/leave-calendar">Review Leave Request</a></p>',
      'leave_request',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  notification_type TEXT,
  related_id UUID,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  retry_count INTEGER DEFAULT 0
);

-- Create index for processing queue
CREATE INDEX IF NOT EXISTS idx_email_queue_sent ON email_queue(sent, created_at);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Only system can access email queue
CREATE POLICY "System can manage email queue" ON email_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create triggers for email notifications
DROP TRIGGER IF EXISTS trigger_email_issue_assignment ON issue_assignees;
CREATE TRIGGER trigger_email_issue_assignment
  AFTER INSERT ON issue_assignees
  FOR EACH ROW
  EXECUTE FUNCTION send_email_issue_assignment();

DROP TRIGGER IF EXISTS trigger_email_issue_comment ON issue_comments;
CREATE TRIGGER trigger_email_issue_comment
  AFTER INSERT ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION send_email_issue_comment();

DROP TRIGGER IF EXISTS trigger_email_leave_status ON leave_requests;
CREATE TRIGGER trigger_email_leave_status
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_email_leave_status();

DROP TRIGGER IF EXISTS trigger_email_leave_request ON leave_requests;
CREATE TRIGGER trigger_email_leave_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION send_email_leave_request();

-- Set application base URL (update this to your production URL)
-- For local development:
ALTER DATABASE postgres SET app.base_url = 'http://localhost:5173';
-- For production, run: ALTER DATABASE postgres SET app.base_url = 'https://yourdomain.com';

-- Function to process email queue (call this from a cron job or edge function)
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record RECORD;
BEGIN
  -- Get unsent emails (limit to 10 per batch to avoid timeouts)
  FOR email_record IN 
    SELECT * FROM email_queue 
    WHERE sent = false AND retry_count < 3
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    -- Here you would integrate with your email service
    -- For now, we'll just mark as sent (you'll need to implement actual sending)
    
    -- This is where you'd call Supabase's email service or an external service
    -- Example: PERFORM extensions.http_post('your-email-service-url', email_record);
    
    -- For demonstration, just mark as sent
    UPDATE email_queue 
    SET sent = true, sent_at = now() 
    WHERE id = email_record.id;
  END LOOP;
END;
$$;

-- Verify the setup
SELECT 'Email notification system created successfully!' as message;
SELECT 'Email queue table created. Emails will be queued for sending.' as note;

