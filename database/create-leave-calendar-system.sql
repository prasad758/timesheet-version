-- Create Leave/PTO Calendar System
-- This allows users to request time off and admins to approve/reject

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('pto', 'sick', 'vacation', 'personal', 'unpaid')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_requests
-- Users can view their own leave requests
CREATE POLICY "Users can view own leave requests" ON leave_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own leave requests
CREATE POLICY "Users can create own leave requests" ON leave_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending leave requests
CREATE POLICY "Users can update own pending requests" ON leave_requests
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

-- Users can delete their own pending leave requests
CREATE POLICY "Users can delete own pending requests" ON leave_requests
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- Admins can view all leave requests
CREATE POLICY "Admins can view all leave requests" ON leave_requests
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can update any leave request (for approval/rejection)
CREATE POLICY "Admins can update leave requests" ON leave_requests
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Function to get leave requests with user emails
CREATE OR REPLACE FUNCTION get_all_leave_requests()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  start_date DATE,
  end_date DATE,
  leave_type TEXT,
  reason TEXT,
  status TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    lr.id,
    lr.user_id,
    COALESCE(au.email::TEXT, 'Unknown') as user_email,
    lr.start_date,
    lr.end_date,
    lr.leave_type,
    lr.reason,
    lr.status,
    lr.requested_at,
    lr.reviewed_by,
    lr.reviewed_at,
    lr.admin_notes,
    lr.created_at,
    lr.updated_at
  FROM leave_requests lr
  LEFT JOIN auth.users au ON lr.user_id = au.id
  ORDER BY lr.created_at DESC;
END;
$$;

-- Verify the setup
SELECT 'Leave system created successfully!' as message;

