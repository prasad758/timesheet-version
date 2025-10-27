import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Clock, MapPin, Pause, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Notifications } from "@/components/Notifications";

const logo = "/techiemaya-logo.png";

interface Issue {
  id: number;
  title: string;
  project_name?: string;
}

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  total_hours: number | null;
  status: string;
  issue: Issue | null;
  project_name: string | null;
  pause_start: string | null;
  paused_duration: number | null;
  pause_reason: string | null;
  latitude: number | null;
  longitude: number | null;
  location_timestamp: string | null;
  location_address: string | null;
  user_email?: string;
}

const Monitoring = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]); // Store all entries
  const [selectedUserId, setSelectedUserId] = useState<string>("all"); // Filter state
  const [users, setUsers] = useState<Array<{user_id: string, email: string}>>([]);
  const navigate = useNavigate();

  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        setIsAdmin(false);
        setAdminCheckComplete(true);
        return;
      }

      const isAdminUser = data?.role === "admin";
      setIsAdmin(isAdminUser);
      setAdminCheckComplete(true);
      
      if (!isAdminUser) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required.",
          variant: "destructive",
        });
        navigate("/time-clock");
      }
    } catch (error) {
      setIsAdmin(false);
      setAdminCheckComplete(true);
    }
  }, [navigate]);

  const loadAllActiveEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.rpc("get_all_users_with_roles");
      
      if (usersError) throw usersError;

      const userMap = new Map(usersData.map((u: any) => [u.user_id, u.email]));

      // Get all recent entries from last 24 hours (not just active ones)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data, error } = await supabase
        .from("time_clock")
        .select("*, issue:issues(id, title, project_name)")
        .gte("clock_in", yesterday.toISOString())
        .order("clock_in", { ascending: false })
        .limit(50);

      if (error) throw error;

      const entriesWithEmail = data.map((entry: any) => ({
        ...entry,
        user_email: userMap.get(entry.user_id) || "Unknown User",
      }));
      
      setAllEntries(entriesWithEmail);
      setEntries(entriesWithEmail);
      
      const uniqueUsers = Array.from(
        new Map(
          entriesWithEmail.map((entry: TimeEntry) => [entry.user_id, { user_id: entry.user_id, email: entry.user_email || "Unknown" }])
        ).values()
      );
      setUsers(uniqueUsers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const getElapsedTime = (clockIn: string, pausedDuration: number = 0) => {
    const start = new Date(clockIn).getTime();
    const now = Date.now();
    const totalMinutes = Math.floor((now - start) / 60000);
    const activeMinutes = Math.max(0, totalMinutes - (pausedDuration * 60));
    const hours = Math.floor(activeMinutes / 60);
    const minutes = activeMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    const initMonitoring = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await checkAdminStatus(session.user.id);
        await loadAllActiveEntries();
      } else {
        navigate("/auth");
      }
    };
    
    initMonitoring();
  }, [checkAdminStatus, loadAllActiveEntries, navigate]);

  useEffect(() => {
    if (selectedUserId === "all") {
      setEntries(allEntries);
    } else {
      setEntries(allEntries.filter(entry => entry.user_id === selectedUserId));
    }
  }, [selectedUserId, allEntries]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/auth");
    }
  };

  if (!adminCheckComplete || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (adminCheckComplete && !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src={logo} alt="TechieMaya" className="h-40" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Monitoring</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/")} variant="outline">
              Timesheet
            </Button>
            <Button onClick={() => navigate("/time-clock")} variant="outline">
              Time Clock
            </Button>
            <Button onClick={() => navigate("/leave-calendar")} variant="outline">
              Leave Calendar
            </Button>
            <Button onClick={() => navigate("/issues")} variant="outline">
              Issues
            </Button>
            <Button onClick={() => navigate("/users")} variant="outline">
              Users
            </Button>
            <Button onClick={loadAllActiveEntries} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Notifications />
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Time Entries (Last 24 Hours) - {entries.length}</span>
              <div className="flex items-center gap-4">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="text-sm px-3 py-1.5 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="all">All Users ({allEntries.length})</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email} ({allEntries.filter(e => e.user_id === user.user_id).length})
                    </option>
                  ))}
                </select>
                <span className="text-sm font-normal text-gray-500">Real-time user activity</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No time entries in the last 24 hours
              </p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border ${
                      entry.status === "paused"
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : entry.status === "clocked_out"
                        ? "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
                        : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{entry.user_email}</h3>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">Issue:</span>
                            <span>{entry.issue?.title || "N/A"}</span>
                          </div>
                          
                          {entry.project_name && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Project:</span>
                              <span>{entry.project_name}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Clock In:</span>
                            <span>{format(new Date(entry.clock_in), "MMM dd, yyyy hh:mm a")}</span>
                          </div>
                          
                          {entry.clock_out && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Clock Out:</span>
                              <span>{format(new Date(entry.clock_out), "MMM dd, yyyy hh:mm a")}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.clock_out ? "Total Time:" : "Elapsed Time:"}</span>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {entry.clock_out 
                                ? `${entry.total_hours?.toFixed(2) || '0.00'}h`
                                : getElapsedTime(entry.clock_in, entry.paused_duration || 0)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-medium">Status:</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              entry.status === "paused"
                                ? "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100"
                                : entry.status === "clocked_out"
                                ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                : "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100"
                            }`}>
                              {entry.status === "paused" ? "⏸ Paused" : entry.status === "clocked_out" ? "⏹ Clocked Out" : "▶ Active"}
                            </span>
                          </div>

                          {entry.notes && (
                            <div>
                              <span className="font-medium">Notes:</span>
                              <p className="text-gray-600 dark:text-gray-300 mt-1">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Location Information */}
                        {(entry.location_address || (entry.latitude && entry.longitude)) ? (
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-start gap-2 mb-2">
                              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1">Location</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {entry.location_address || `${entry.latitude?.toFixed(6)}, ${entry.longitude?.toFixed(6)}`}
                                </p>
                                {entry.location_timestamp && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Captured: {format(new Date(entry.location_timestamp), "hh:mm a")}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {entry.latitude && entry.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View on Google Maps →
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1 text-gray-600 dark:text-gray-400">Location</p>
                                <p className="text-xs text-gray-500">
                                  Location tracking is enabled. Location will be captured on next clock-in.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pause Reason */}
                        {entry.status === "paused" && entry.pause_reason && (
                          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-700">
                            <div className="flex items-start gap-2">
                              <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1 text-amber-900 dark:text-amber-100">
                                  Pause Reason
                                </p>
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                  {entry.pause_reason}
                                </p>
                                {entry.paused_duration && entry.paused_duration > 0 && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Paused for: {(entry.paused_duration * 60).toFixed(0)} minutes
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitoring;

