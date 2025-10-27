import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users as UsersIcon, LogOut, Shield, User as UserIcon, RefreshCw } from "lucide-react";
import { User } from "@supabase/supabase-js";
const logo = "/techiemaya-logo.png";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const Users = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        checkAdminStatus(session.user.id);
        loadUsers();
      }
    });
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(data?.role === "admin");
    } catch (err) {
      console.error("Error in checkAdminStatus:", err);
      setIsAdmin(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log("Loading users...");
      
      // Call the database function to get users with their emails
      const { data, error } = await supabase
        .rpc("get_all_users_with_roles");

      if (error) {
        console.error("Error loading users:", error);
        throw error;
      }

      console.log("Users data from function:", data);

      if (data && data.length > 0) {
        const userProfiles = data.map((user: any) => ({
          id: user.user_id,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        }));
        
        console.log("User profiles:", userProfiles);
        setUsers(userProfiles);
      } else {
        console.log("No users found");
        setUsers([]);
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load users",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot Change Own Role",
        description: "You cannot change your own role",
        variant: "destructive",
      });
      return;
    }

    // Check if trying to remove the last admin
    if (currentRole === "admin") {
      const adminCount = users.filter(u => u.role === "admin").length;
      if (adminCount <= 1) {
        toast({
          title: "Cannot Remove Last Admin",
          description: "You must assign another admin before removing this admin role",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const newRole = currentRole === "admin" ? "user" : "admin";
      
      const { error } = await supabase
        .from("user_roles")
        .upsert(
          {
            user_id: userId,
            role: newRole,
          },
          {
            onConflict: 'user_id'  // Specify which column to use for conflict resolution
          }
        );

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error (ignoring):", error);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error("Storage clear error:", e);
      }
      window.location.replace("/auth");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Access Denied. Admin privileges required.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-40 w-auto" />
            <h1 className="text-2xl font-bold">User Management</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Timesheet
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/issues"}>
              Issues
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/monitoring"}>
              Monitoring
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/time-clock"}>
              Time Clock
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/leave-calendar"}>
              Leave Calendar
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                All Users
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUsers}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <Shield className="h-4 w-4 text-purple-500" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        )}
                        <h3 className="font-semibold">{user.email}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            user.role === "admin"
                              ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant={user.role === "admin" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleUserRole(user.id, user.role)}
                      disabled={loading || user.id === currentUser?.id}
                    >
                      {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Admin:</strong> Can create tasks, assign tasks to users, and manage user
              roles.
            </p>
            <p>
              <strong>User:</strong> Can only clock in/out to tasks assigned to them by admins.
            </p>
            <p className="text-muted-foreground mt-4">
              💡 Tip: Go to the Issues page to create and assign issues to users.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;

