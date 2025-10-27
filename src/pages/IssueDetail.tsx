import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, MessageSquare, Tag, User, X } from "lucide-react";
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
  updated_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_email: string;
}

interface Activity {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  user_email: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Assignee {
  user_id: string;
  email: string;
}

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [issueLabels, setIssueLabels] = useState<Label[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Assignee[]>([]);
  
  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectName, setEditProjectName] = useState("");

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUser(session.user);
      await checkAdminStatus(session.user.id);
      await loadIssueData();
      await loadLabels();
      await loadUsers();
      setLoading(false);
    };

    initPage();
  }, [id, navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    setIsAdmin(data?.role === "admin");
  };

  const loadIssueData = async () => {
    // Load issue
    const { data: issueData, error: issueError } = await supabase
      .from("issues")
      .select("*")
      .eq("id", id)
      .single();

    if (issueError) {
      toast({
        title: "Error",
        description: "Failed to load issue",
        variant: "destructive",
      });
      navigate("/issues");
      return;
    }

    setIssue(issueData);
    setEditTitle(issueData.title);
    setEditDescription(issueData.description || "");
    setEditProjectName(issueData.project_name || "");

    // Load assignees
    const { data: assigneesData } = await supabase
      .from("issue_assignees")
      .select("user_id")
      .eq("issue_id", id);

    if (assigneesData) {
      const userEmails = await Promise.all(
        assigneesData.map(async (a) => {
          const { data: userData } = await supabase.rpc("get_all_users_with_roles");
          const user = userData?.find((u: any) => u.user_id === a.user_id);
          return {
            user_id: a.user_id,
            email: user?.email || 'Unknown'
          };
        })
      );
      setAssignees(userEmails);
    }

    // Load labels
    const { data: labelsData } = await supabase
      .from("issue_labels")
      .select(`
        label_id,
        labels (
          id,
          name,
          color
        )
      `)
      .eq("issue_id", id);

    if (labelsData) {
      setIssueLabels(labelsData.map((l: any) => l.labels).filter(Boolean));
    }

    // Load comments
    const { data: commentsData } = await supabase
      .from("issue_comments")
      .select("*")
      .eq("issue_id", id)
      .order("created_at", { ascending: true });

    if (commentsData) {
      const commentsWithEmails = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: userData } = await supabase.rpc("get_all_users_with_roles");
          const user = userData?.find((u: any) => u.user_id === comment.user_id);
          return {
            ...comment,
            user_email: user?.email || 'Unknown'
          };
        })
      );
      setComments(commentsWithEmails);
    }

    // Load activity
    const { data: activityData } = await supabase
      .from("issue_activity")
      .select("*")
      .eq("issue_id", id)
      .order("created_at", { ascending: false });

    if (activityData) {
      const activitiesWithEmails = await Promise.all(
        activityData.map(async (activity) => {
          const { data: userData } = await supabase.rpc("get_all_users_with_roles");
          const user = userData?.find((u: any) => u.user_id === activity.user_id);
          return {
            ...activity,
            user_email: user?.email || 'Unknown'
          };
        })
      );
      setActivities(activitiesWithEmails);
    }
  };

  const loadLabels = async () => {
    const { data } = await supabase
      .from("labels")
      .select("*")
      .order("name");

    if (data) {
      setAvailableLabels(data);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.rpc("get_all_users_with_roles");

    if (data) {
      setAvailableUsers(data);
    }
  };

  const updateIssueStatus = async (newStatus: 'open' | 'in_progress' | 'closed') => {
    const { error } = await supabase
      .from("issues")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'closed' ? { closed_at: new Date().toISOString() } : {})
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      await supabase.from("issue_activity").insert({
        issue_id: id,
        user_id: currentUser?.id,
        action: 'status_changed',
        details: { old_status: issue?.status, new_status: newStatus }
      });

      toast({
        title: "Success",
        description: `Issue status updated to ${newStatus.replace('_', ' ')}`,
      });
      loadIssueData();
    }
  };

  const saveIssue = async () => {
    const { error } = await supabase
      .from("issues")
      .update({
        title: editTitle,
        description: editDescription,
        project_name: editProjectName,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update issue",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Issue updated successfully",
      });
      setIsEditing(false);
      loadIssueData();
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const { error } = await supabase
      .from("issue_comments")
      .insert({
        issue_id: id,
        user_id: currentUser?.id,
        comment: newComment
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } else {
      await supabase.from("issue_activity").insert({
        issue_id: id,
        user_id: currentUser?.id,
        action: 'commented',
        details: { comment: newComment.substring(0, 100) }
      });

      setNewComment("");
      loadIssueData();
    }
  };

  const addLabel = async (labelId: string) => {
    const { error } = await supabase
      .from("issue_labels")
      .insert({
        issue_id: id,
        label_id: labelId
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add label",
        variant: "destructive",
      });
    } else {
      const label = availableLabels.find(l => l.id === labelId);
      await supabase.from("issue_activity").insert({
        issue_id: id,
        user_id: currentUser?.id,
        action: 'labeled',
        details: { label_name: label?.name }
      });
      loadIssueData();
    }
  };

  const removeLabel = async (labelId: string) => {
    const { error } = await supabase
      .from("issue_labels")
      .delete()
      .match({ issue_id: id, label_id: labelId });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove label",
        variant: "destructive",
      });
    } else {
      loadIssueData();
    }
  };

  const assignUser = async (userId: string) => {
    const { error } = await supabase
      .from("issue_assignees")
      .insert({
        issue_id: id,
        user_id: userId,
        assigned_by: currentUser?.id
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign user",
        variant: "destructive",
      });
    } else {
      const user = availableUsers.find(u => u.user_id === userId);
      await supabase.from("issue_activity").insert({
        issue_id: id,
        user_id: currentUser?.id,
        action: 'assigned',
        details: { assignee_email: user?.email }
      });
      loadIssueData();
    }
  };

  const unassignUser = async (userId: string) => {
    const { error } = await supabase
      .from("issue_assignees")
      .delete()
      .match({ issue_id: id, user_id: userId });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unassign user",
        variant: "destructive",
      });
    } else {
      loadIssueData();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'closed':
        return <CheckCircle2 className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  if (loading || !issue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading issue...</p>
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
            <Button variant="outline" onClick={() => navigate("/issues")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Issues
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issue Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStatusIcon(issue.status)}
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-2xl font-bold"
                      />
                    ) : (
                      <div>
                        <h1 className="text-2xl font-bold">{issue.title}</h1>
                        <p className="text-gray-500 mt-1">#{issue.id}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={6}
                      />
                    </div>
                    <div>
                      <Label>Project Name</Label>
                      <Input
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveIssue}>Save</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 whitespace-pre-wrap">{issue.description || "No description provided."}</p>
                    {isAdmin && (
                      <Button className="mt-4" variant="outline" onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-gray-300 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{comment.user_email}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}

                <div className="mt-4 space-y-2">
                  <Label>Add Comment</Label>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                  />
                  <Button onClick={addComment} disabled={!newComment.trim()}>
                    Comment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-2 text-sm">
                      <span className="text-gray-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                      <span className="font-semibold">{activity.user_email}</span>
                      <span>{activity.action}</span>
                      {activity.details && (
                        <span className="text-gray-600">
                          {JSON.stringify(activity.details)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full"
                    variant={issue.status === 'open' ? 'default' : 'outline'}
                    onClick={() => updateIssueStatus('open')}
                  >
                    Open
                  </Button>
                  <Button
                    className="w-full"
                    variant={issue.status === 'in_progress' ? 'default' : 'outline'}
                    onClick={() => updateIssueStatus('in_progress')}
                  >
                    In Progress
                  </Button>
                  <Button
                    className="w-full"
                    variant={issue.status === 'closed' ? 'default' : 'outline'}
                    onClick={() => updateIssueStatus('closed')}
                  >
                    Closed
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Assignees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assignees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignees.map((assignee) => (
                  <div key={assignee.user_id} className="flex items-center justify-between">
                    <span className="text-sm">{assignee.email}</span>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => unassignUser(assignee.user_id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        assignUser(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="">Assign user...</option>
                    {availableUsers
                      .filter(u => !assignees.some(a => a.user_id === u.user_id))
                      .map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.email}
                        </option>
                      ))}
                  </select>
                )}
              </CardContent>
            </Card>

            {/* Labels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Labels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {issueLabels.map((label) => (
                    <div
                      key={label.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      <span>{label.name}</span>
                      {isAdmin && (
                        <button onClick={() => removeLabel(label.id)}>
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isAdmin && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addLabel(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="">Add label...</option>
                    {availableLabels
                      .filter(l => !issueLabels.some(il => il.id === l.id))
                      .map(label => (
                        <option key={label.id} value={label.id}>
                          {label.name}
                        </option>
                      ))}
                  </select>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Priority:</span>{' '}
                  <span className="capitalize">{issue.priority}</span>
                </div>
                {issue.project_name && (
                  <div>
                    <span className="font-semibold">Project:</span> {issue.project_name}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Created:</span>{' '}
                  {new Date(issue.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Updated:</span>{' '}
                  {new Date(issue.updated_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

