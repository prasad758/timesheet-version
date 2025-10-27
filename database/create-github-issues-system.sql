-- Create GitHub-style Issues System
-- This replaces the old tasks system with a comprehensive issue tracking system

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL, -- hex color code
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create sprints/projects table
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create issues table (replaces tasks)
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  project_name TEXT,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Create issue_assignees table (many-to-many)
CREATE TABLE IF NOT EXISTS issue_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(issue_id, user_id)
);

-- Create issue_labels table (many-to-many)
CREATE TABLE IF NOT EXISTS issue_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(issue_id, label_id)
);

-- Create issue_comments table
CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create issue_activity table (for timeline)
CREATE TABLE IF NOT EXISTS issue_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- e.g., 'created', 'assigned', 'labeled', 'status_changed', 'commented'
  details JSONB, -- store additional data like old_value, new_value, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update time_clock table to reference issues instead of tasks
ALTER TABLE time_clock DROP CONSTRAINT IF EXISTS time_clock_task_id_fkey;
ALTER TABLE time_clock ADD COLUMN IF NOT EXISTS issue_id INTEGER REFERENCES issues(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON issues(created_by);
CREATE INDEX IF NOT EXISTS idx_issues_sprint_id ON issues(sprint_id);
CREATE INDEX IF NOT EXISTS idx_issue_assignees_user_id ON issue_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_assignees_issue_id ON issue_assignees(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_labels_issue_id ON issue_labels(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_activity_issue_id ON issue_activity(issue_id);

-- Enable RLS
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for labels (everyone can read, only admins can create/update)
CREATE POLICY "Anyone can view labels" ON labels FOR SELECT USING (true);
CREATE POLICY "Admins can manage labels" ON labels FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for sprints
CREATE POLICY "Anyone can view sprints" ON sprints FOR SELECT USING (true);
CREATE POLICY "Admins can manage sprints" ON sprints FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for issues
CREATE POLICY "Anyone can view issues" ON issues FOR SELECT USING (true);
CREATE POLICY "Admins can create issues" ON issues FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update issues" ON issues FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete issues" ON issues FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for issue_assignees
CREATE POLICY "Anyone can view issue assignments" ON issue_assignees FOR SELECT USING (true);
CREATE POLICY "Admins can manage issue assignments" ON issue_assignees FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for issue_labels
CREATE POLICY "Anyone can view issue labels" ON issue_labels FOR SELECT USING (true);
CREATE POLICY "Admins can manage issue labels" ON issue_labels FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for issue_comments
CREATE POLICY "Anyone can view comments" ON issue_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON issue_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own comments" ON issue_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins and comment owners can delete comments" ON issue_comments FOR DELETE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for issue_activity
CREATE POLICY "Anyone can view activity" ON issue_activity FOR SELECT USING (true);
CREATE POLICY "System can create activity" ON issue_activity FOR INSERT WITH CHECK (true);

-- Insert default labels
INSERT INTO labels (name, color, description) VALUES
  ('Feature', '#0e8a16', 'New feature or request'),
  ('Bug', '#d73a4a', 'Something isn''t working'),
  ('Enhancement', '#a2eeef', 'Improvement to existing feature'),
  ('Documentation', '#0075ca', 'Documentation improvements'),
  ('Help Wanted', '#008672', 'Extra attention is needed'),
  ('Question', '#d876e3', 'Further information is requested'),
  ('Urgent', '#e99695', 'Needs immediate attention')
ON CONFLICT (name) DO NOTHING;

-- Drop old tables if they exist (no migration needed as no data exists)
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Verify the setup
SELECT 'Labels created:' as info, COUNT(*) as count FROM labels
UNION ALL
SELECT 'Issues created:' as info, COUNT(*) as count FROM issues;

