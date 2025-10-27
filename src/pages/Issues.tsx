import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Clock, LogOut, Plus, Tag, User } from "lucide-react";
import logo from "/techiemaya-logo.png";

interface Issue {
  id: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_name: string | null;
  created_at: string;
  created_by: string | null;
  assignees: Array<{ user_id: string; email: string }>;
  labels: Array<{ id: string; name: string; color: string }>;
}

interface Label {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface UserProfile {
  user_id: string;
  email: string;
}

export default function Issues() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDescription, setNewIssueDescription] = useState("");
  const [newIssueProjectName, setNewIssueProjectName] = useState("");
  const [newIssuePriority, setNewIssuePriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUser(session.user);
      await checkAdminStatus(session.user.id);
      await loadLabels();
      await loadUsers();
      await loadIssues();
      setLoading(false);
    };

    initPage();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    setIsAdmin(data?.role === "admin");
  };

  const loadLabels = async () => {
    const { data, error } = await supabase
      .from("labels")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error loading labels:", error);
    } else {
      setLabels(data || []);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc("get_all_users_with_roles");

    if (error) {
      console.error("Error loading users:", error);
    } else {
      setUsers(data || []);
    }
  };

  const loadIssues = async () => {
    let query = supabase
      .from("issues")
      .select(`
        *,
        issue_assignees (
          user_id
        ),
        issue_labels (
          label_id,
          labels (
            id,
            name,
            color
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load issues",
        variant: "destructive",
      });
      return;
    }

    // Transform the data to match our interface
    const transformedIssues = await Promise.all((data || []).map(async (issue: any) => {
      // Get assignee emails
      const assigneeEmails = await Promise.all(
        (issue.issue_assignees || []).map(async (assignment: any) => {
          const user = users.find(u => u.user_id === assignment.user_id);
          return {
            user_id: assignment.user_id,
            email: user?.email || 'Unknown'
          };
        })
      );

      // Get labels
      const issueLabels = (issue.issue_labels || [])
        .map((il: any) => il.labels)
        .filter(Boolean);

      return {
        ...issue,
        assignees: assigneeEmails,
        labels: issueLabels
      };
    }));

    // Apply assignee filter
    let filteredIssues = transformedIssues;
    if (filterAssignee !== 'all') {
      filteredIssues = transformedIssues.filter(issue =>
        issue.assignees.some(a => a.user_id === filterAssignee)
      );
    }

    setIssues(filteredIssues);
  };

  const createIssue = async () => {
    if (!newIssueTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter an issue title",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("issues")
      .insert({
        title: newIssueTitle,
        description: newIssueDescription,
        project_name: newIssueProjectName,
        priority: newIssuePriority,
        created_by: currentUser?.id,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create issue",
        variant: "destructive",
      });
    } else {
      // Create activity entry
      await supabase.from("issue_activity").insert({
        issue_id: data.id,
        user_id: currentUser?.id,
        action: 'created',
        details: { title: newIssueTitle }
      });

      toast({
        title: "Success",
        description: `Issue #${data.id} created successfully`,
      });

      setNewIssueTitle("");
      setNewIssueDescription("");
      setNewIssueProjectName("");
      setNewIssuePriority('medium');
      setShowCreateDialog(false);
      loadIssues();
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore errors
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/auth");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 font-bold';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-gray-500';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src={logo} alt="TechieMaya" className="h-40" />
            <h1 className="text-3xl font-bold">Issues</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              Timesheet
            </Button>
            <Button variant="outline" onClick={() => navigate("/time-clock")}>
              Time Clock
            </Button>
            <Button variant="outline" onClick={() => navigate("/leave-calendar")}>
              Leave Calendar
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => navigate("/users")}>
                  Users
                </Button>
                <Button variant="outline" onClick={() => navigate("/monitoring")}>
                  Monitoring
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Filters and Create Button */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label>Status</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label>Assignee</Label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="all">All Assignees</option>
                  {users.map(user => (
                    <option key={user.user_id} value={user.user_id}>{user.email}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <Button onClick={loadIssues}>
                  Apply Filters
                </Button>
                {isAdmin && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Issue
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filterStatus === 'all' ? 'All Issues' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Issues`} ({issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No issues found</p>
                {isAdmin && (
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                    Create First Issue
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getStatusIcon(issue.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            {issue.title}
                          </h3>
                          <span className="text-gray-500">#{issue.id}</span>
                          {issue.labels.map((label) => (
                            <span
                              key={label.id}
                              className="px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: label.color }}
                            >
                              {label.name}
                            </span>
                          ))}
                          <span className={`text-xs uppercase ${getPriorityColor(issue.priority)}`}>
                            {issue.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="capitalize">{issue.status.replace('_', ' ')}</span>
                          {issue.project_name && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {issue.project_name}
                            </span>
                          )}
                          {issue.assignees.length > 0 && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {issue.assignees.map(a => a.email).join(', ')}
                            </span>
                          )}
                          <span>
                            Created {new Date(issue.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Issue Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Issue</DialogTitle>
            <DialogDescription>
              Create a new issue to track work, bugs, or feature requests
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                placeholder="Brief description of the issue"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newIssueDescription}
                onChange={(e) => setNewIssueDescription(e.target.value)}
                placeholder="Detailed description of the issue..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="project">Project Name</Label>
              <Input
                id="project"
                value={newIssueProjectName}
                onChange={(e) => setNewIssueProjectName(e.target.value)}
                placeholder="e.g., VCP Automation"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={newIssuePriority}
                onChange={(e) => setNewIssuePriority(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createIssue} disabled={loading}>
              Create Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

