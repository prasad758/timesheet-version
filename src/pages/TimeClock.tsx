import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Clock, LogOut, Play, Square, Pause } from "lucide-react";
import { User } from "@supabase/supabase-js";
const logo = "/techiemaya-logo.png";

interface Issue {
  id: number;
  title: string;
  project_name?: string;
  status: string;
}

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  total_hours: number | null;
  status: string; // 'clocked_in' | 'paused' | 'clocked_out'
  issue: Issue | null;
  project_name: string | null;
  pause_start: string | null;
  paused_duration: number | null; // Total paused time in hours
  pause_reason: string | null; // Reason for pausing
  latitude: number | null; // Location latitude
  longitude: number | null; // Location longitude
  location_timestamp: string | null; // When location was captured
  location_address: string | null; // Human-readable address
}

const TimeClock = () => {
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminStatus(session.user.id);
        loadIssues(session.user.id);
        loadCurrentEntry(session.user.id);
        loadTimeEntries(session.user.id);
      }
    });
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const adminStatus = data?.role === "admin";
    setIsAdmin(adminStatus);
  };

  const loadIssues = async (userId: string) => {
    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const userIsAdmin = roleData?.role === "admin";

    if (userIsAdmin) {
      // Admin sees all open and in-progress issues
      const { data } = await supabase
        .from("issues")
        .select("id, title, project_name, status")
        .in("status", ["open", "in_progress"])
        .order("title");

      setIssues(data || []);
    } else {
      // Regular users only see assigned issues
      const { data: assignedIssues } = await supabase
        .from("issue_assignees")
        .select("issue_id")
        .eq("user_id", userId);

      if (assignedIssues && assignedIssues.length > 0) {
        const issueIds = assignedIssues.map((a: any) => a.issue_id);
        
        const { data: activeIssues } = await supabase
          .from("issues")
          .select("id, title, project_name, status")
          .in("id", issueIds)
          .in("status", ["open", "in_progress"])
          .order("title");
        
        setIssues(activeIssues || []);
      } else {
        setIssues([]);
      }
    }
  };

  const loadCurrentEntry = async (userId: string) => {
    const { data } = await supabase
      .from("time_clock")
      .select("*, issue:issues(id, title, project_name, status)")
      .eq("user_id", userId)
      .in("status", ["clocked_in", "paused"])
      .order("clock_in", { ascending: false })
      .limit(1)
      .single();

    setCurrentEntry(data);
  };

  const loadTimeEntries = async (userId: string) => {
    const { data } = await supabase
      .from("time_clock")
      .select("*, issue:issues(id, title, project_name, status)")
      .eq("user_id", userId)
      .order("clock_in", { ascending: false })
      .limit(10);

    setTimeEntries(data || []);
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

  const getUserLocation = (): Promise<{latitude: number, longitude: number, accuracy?: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser");
        toast({
          title: "Location Unavailable",
          description: "Your browser doesn't support geolocation.",
          variant: "destructive",
        });
        resolve(null);
        return;
      }

      // Request high accuracy location with proper settings
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy, // Accuracy in meters
          });
        },
        (error) => {
          let errorMessage = "Unable to get location";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable. Please check your device's location settings.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out. Please try again.";
              break;
          }
          
          toast({
            title: "Location Error",
            description: errorMessage,
          });
          
          resolve(null); // Don't block clock in if location fails
        },
        { 
          enableHighAccuracy: true,  // Use GPS for better accuracy
          timeout: 10000,             // Wait up to 10 seconds for accurate position
          maximumAge: 0               // Don't use cached position, always get fresh location
        }
      );
    });
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TechieMaya-Timesheet-App'
          }
        }
      );
      
      if (!response.ok) {
        console.warn("Failed to fetch address");
        return null;
      }

      const data = await response.json();
      
      // Build a readable address from the response
      const address = data.address;
      const parts = [];
      
      if (address.road) parts.push(address.road);
      if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
      if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      
      return parts.length > 0 ? parts.join(", ") : data.display_name;
    } catch (error) {
      console.warn("Error fetching address:", error);
      return null;
    }
  };

  const clockIn = async () => {
    if (!user) return;

    if (!selectedIssueId) {
      toast({
        title: "Issue Required",
        description: "Please select an issue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Show location fetching message
      toast({
        title: "Getting location...",
        description: "Please wait while we get your accurate location.",
      });

      // Get user location
      const location = await getUserLocation();
      const locationTimestamp = location ? new Date().toISOString() : null;
      
      // Get address from coordinates (if location available)
      let locationAddress = null;
      if (location) {
        locationAddress = await getAddressFromCoordinates(location.latitude, location.longitude);
      }

      const { data, error } = await supabase
        .from("time_clock")
        .insert({
          user_id: user.id,
          issue_id: selectedIssueId,
          project_name: projectName,
          clock_in: new Date().toISOString(),
          notes: notes || null,
          status: "clocked_in",
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          location_timestamp: locationTimestamp,
          location_address: locationAddress,
        })
        .select("*, issue:issues(id, title, project_name, status)")
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setSelectedIssueId("");
      setProjectName("");
      setNotes("");
      
      // Build location message with accuracy info
      let locationMsg = "";
      if (locationAddress) {
        locationMsg = ` Location: ${locationAddress}`;
        if (location?.accuracy) {
          const accuracyText = location.accuracy < 50 ? "High accuracy" : 
                              location.accuracy < 100 ? "Good accuracy" : "Approximate";
          locationMsg += ` (${accuracyText}: ±${Math.round(location.accuracy)}m)`;
        }
      } else if (location) {
        locationMsg = ` Location captured`;
        if (location.accuracy) {
          locationMsg += ` (±${Math.round(location.accuracy)}m accuracy)`;
        }
      }
      
      toast({
        title: "Clocked In Successfully",
        description: `Time tracking started!${locationMsg}`,
      });
      loadTimeEntries(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clockOut = async () => {
    if (!user || !currentEntry) return;

    setLoading(true);
    try {
      const clockOutTime = new Date();
      const clockInTime = new Date(currentEntry.clock_in);
      
      // Calculate total hours excluding paused time
      let totalMilliseconds = clockOutTime.getTime() - clockInTime.getTime();
      const pausedMilliseconds = (currentEntry.paused_duration || 0) * 60 * 60 * 1000;
      const actualWorkMilliseconds = totalMilliseconds - pausedMilliseconds;
      const hours = actualWorkMilliseconds / (1000 * 60 * 60);

      // Update time_clock entry
      const { error } = await supabase
        .from("time_clock")
        .update({
          clock_out: clockOutTime.toISOString(),
          total_hours: parseFloat(hours.toFixed(2)),
          status: "clocked_out",
        })
        .eq("id", currentEntry.id);

      if (error) throw error;

      // Add to weekly timesheet
      await addToTimesheet(clockInTime, hours);

      setCurrentEntry(null);
      toast({
        title: "Clocked Out",
        description: `Total time: ${hours.toFixed(2)} hours added to timesheet`,
      });
      loadTimeEntries(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseClick = () => {
    setShowPauseDialog(true);
    setPauseReason("");
  };

  const pauseWork = async () => {
    if (!user || !currentEntry || !pauseReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for pausing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const pauseTime = new Date();

      const { error } = await supabase
        .from("time_clock")
        .update({
          pause_start: pauseTime.toISOString(),
          pause_reason: pauseReason.trim(),
          status: "paused",
        })
        .eq("id", currentEntry.id);

      if (error) throw error;

      setCurrentEntry({
        ...currentEntry,
        pause_start: pauseTime.toISOString(),
        pause_reason: pauseReason.trim(),
        status: "paused",
      });

      toast({
        title: "Work Paused",
        description: "Timer has been paused",
      });
      setShowPauseDialog(false);
      setPauseReason("");
      loadTimeEntries(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pause",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resumeWork = async () => {
    if (!user || !currentEntry || !currentEntry.pause_start) return;

    setLoading(true);
    try {
      const resumeTime = new Date();
      const pauseStartTime = new Date(currentEntry.pause_start);
      
      // Calculate paused duration in hours
      const pauseDuration = (resumeTime.getTime() - pauseStartTime.getTime()) / (1000 * 60 * 60);
      const totalPausedDuration = (currentEntry.paused_duration || 0) + pauseDuration;

      const { error } = await supabase
        .from("time_clock")
        .update({
          pause_start: null,
          paused_duration: parseFloat(totalPausedDuration.toFixed(2)),
          status: "clocked_in",
        })
        .eq("id", currentEntry.id);

      if (error) throw error;

      setCurrentEntry({
        ...currentEntry,
        pause_start: null,
        paused_duration: parseFloat(totalPausedDuration.toFixed(2)),
        status: "clocked_in",
      });

      toast({
        title: "Work Resumed",
        description: "Timer has been resumed",
      });
      loadTimeEntries(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToTimesheet = async (clockInTime: Date, hours: number) => {
    if (!user || !currentEntry) return;

    // Get week start and end
    const weekStart = startOfWeek(clockInTime, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(clockInTime, { weekStartsOn: 1 });

    // Determine which day of the week
    const dayOfWeek = clockInTime.getDay();
    const dayMap: { [key: number]: string } = {
      1: "mon_hours",
      2: "tue_hours",
      3: "wed_hours",
      4: "thu_hours",
      5: "fri_hours",
      6: "sat_hours",
      0: "sun_hours",
    };
    const dayColumn = dayMap[dayOfWeek];

    // Find or create timesheet for this week
    let { data: timesheet } = await supabase
      .from("timesheets")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start", format(weekStart, "yyyy-MM-dd"))
      .single();

    if (!timesheet) {
      const { data: newTimesheet } = await supabase
        .from("timesheets")
        .insert({
          user_id: user.id,
          week_start: format(weekStart, "yyyy-MM-dd"),
          week_end: format(weekEnd, "yyyy-MM-dd"),
          status: "draft",
        })
        .select()
        .single();
      timesheet = newTimesheet;
    }

    if (!timesheet) return;

    // Get issue title and project name
    const issueTitle = currentEntry.issue?.title || "Time Clock Entry";
    const projectName = currentEntry.project_name || "Project";

    // Find existing entry for this project and issue
    const { data: existingEntry } = await supabase
      .from("timesheet_entries")
      .select("*")
      .eq("timesheet_id", timesheet.id)
      .eq("project", projectName)
      .eq("task_title", issueTitle)
      .eq("source", "time_clock")
      .single();

    if (existingEntry) {
      // Update existing entry
      const currentHours = Number(existingEntry[dayColumn]) || 0;
      await supabase
        .from("timesheet_entries")
        .update({
          [dayColumn]: currentHours + parseFloat(hours.toFixed(2)),
        })
        .eq("id", existingEntry.id);
    } else {
      // Create new entry
      await supabase.from("timesheet_entries").insert({
        timesheet_id: timesheet.id,
        project: projectName,
        task: issueTitle,
        task_title: issueTitle,
        source: "time_clock",
        mon_hours: dayColumn === "mon_hours" ? parseFloat(hours.toFixed(2)) : 0,
        tue_hours: dayColumn === "tue_hours" ? parseFloat(hours.toFixed(2)) : 0,
        wed_hours: dayColumn === "wed_hours" ? parseFloat(hours.toFixed(2)) : 0,
        thu_hours: dayColumn === "thu_hours" ? parseFloat(hours.toFixed(2)) : 0,
        fri_hours: dayColumn === "fri_hours" ? parseFloat(hours.toFixed(2)) : 0,
        sat_hours: dayColumn === "sat_hours" ? parseFloat(hours.toFixed(2)) : 0,
        sun_hours: dayColumn === "sun_hours" ? parseFloat(hours.toFixed(2)) : 0,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="TechieMaya Logo" className="h-40 w-auto" />
            <h1 className="text-2xl font-bold">Time Clock</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Timesheet
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/leave-calendar"}>
              Leave Calendar
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => window.location.href = "/issues"}>
                  Issues
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/users"}>
                  Users
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/monitoring"}>
                  Monitoring
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Clock In/Out Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {currentEntry ? "Clock Out" : "Clock In"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentEntry ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  currentEntry.status === 'paused' 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                  <p className="text-sm text-muted-foreground">
                    {currentEntry.status === 'paused' ? 'Work Paused' : 'Currently clocked in'}
                  </p>
                  <p className="text-lg font-semibold">
                    {currentEntry.project_name || "Project"}
                  </p>
                  <p className="text-base">
                    Issue: {currentEntry.issue ? `#${currentEntry.issue.id} - ${currentEntry.issue.title}` : "No issue selected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started: {format(new Date(currentEntry.clock_in), "PPp")}
                  </p>
                  {currentEntry.paused_duration && currentEntry.paused_duration > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Paused time: {currentEntry.paused_duration.toFixed(2)} hours
                    </p>
                  )}
                  {currentEntry.notes && (
                    <p className="text-sm mt-2">Notes: {currentEntry.notes}</p>
                  )}
                  {currentEntry.status === 'paused' && currentEntry.pause_reason && (
                    <p className="text-sm mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      Pause Reason: {currentEntry.pause_reason}
                    </p>
                  )}
                  {(currentEntry.location_address || (currentEntry.latitude && currentEntry.longitude)) && (
                    <p className="text-sm mt-2 text-blue-600 dark:text-blue-400">
                      📍 {currentEntry.location_address || `${currentEntry.latitude?.toFixed(6)}, ${currentEntry.longitude?.toFixed(6)}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentEntry.status === 'paused' ? (
                    <Button onClick={resumeWork} disabled={loading} className="flex-1" size="lg" variant="default">
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </Button>
                  ) : (
                    <Button onClick={handlePauseClick} disabled={loading} className="flex-1" size="lg" variant="outline">
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                  )}
                  <Button onClick={clockOut} disabled={loading} className="flex-1" size="lg" variant="destructive">
                    <Square className="mr-2 h-5 w-5" />
                    Clock Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Issue <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={selectedIssueId}
                    onChange={(e) => {
                      const issueId = e.target.value;
                      setSelectedIssueId(issueId);
                      // Auto-populate project name from selected issue
                      const selectedIssue = issues.find(i => String(i.id) === issueId);
                      if (selectedIssue?.project_name) {
                        setProjectName(selectedIssue.project_name);
                      }
                    }}
                  >
                    <option value="">Select an issue...</option>
                    {issues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        #{issue.id} - {issue.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notes (Optional)
                  </label>
                  <Input
                    placeholder="Add notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button onClick={clockIn} disabled={loading} className="w-full" size="lg">
                  <Play className="mr-2 h-5 w-5" />
                  Clock In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No time entries yet
              </p>
            ) : (
              <div className="space-y-3">
                {timeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            entry.status === "clocked_in"
                              ? "bg-green-500"
                              : entry.status === "paused"
                              ? "bg-amber-500"
                              : "bg-gray-400"
                          }`}
                        />
                        <h3 className="font-semibold">
                          {entry.issue ? `#${entry.issue.id} - ${entry.issue.title}` : "No issue"}
                        </h3>
                        {entry.status === "paused" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.clock_in), "PPp")}
                        {entry.clock_out &&
                          ` - ${format(new Date(entry.clock_out), "PPp")}`}
                      </p>
                      {entry.paused_duration && entry.paused_duration > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Paused: {entry.paused_duration.toFixed(2)}h
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Notes: {entry.notes}
                        </p>
                      )}
                      {entry.status === "paused" && entry.pause_reason && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                          Pause Reason: {entry.pause_reason}
                        </p>
                      )}
                      {entry.latitude && entry.longitude && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          📍 {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {entry.total_hours ? (
                        <p className="text-lg font-semibold">
                          {entry.total_hours}h
                        </p>
                      ) : (
                        <p className={`text-sm ${
                          entry.status === "paused"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-600 dark:text-green-400"
                        }`}>
                          {entry.status === "paused" ? "Paused" : "In Progress"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pause Reason Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Work</DialogTitle>
            <DialogDescription>
              Please provide a reason for pausing your work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pauseReason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="pauseReason"
                placeholder="Enter reason for pausing (e.g., Meeting, Break, etc.)"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPauseDialog(false);
                setPauseReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={pauseWork}
              disabled={loading || !pauseReason.trim()}
            >
              Pause Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeClock;

