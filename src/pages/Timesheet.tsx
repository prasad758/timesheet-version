import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, isAfter } from "date-fns";
import { Plus, Trash2, Save, LogOut, Share2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { User } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Notifications } from "@/components/Notifications";
// import logo from "@/assets/techiemaya-logo.png";
const logo = "/techiemaya-logo.png";

interface TimesheetEntry {
  id?: string;
  project: string;
  task: string;
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
  sat_hours: number;
  sun_hours: number;
  source?: string; // 'manual' or 'time_clock'
}

interface UserProfile {
  id: string;
  email: string;
}

const Timesheet = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timesheetId, setTimesheetId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weekEnd, setWeekEnd] = useState<Date>(
    endOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [entries, setEntries] = useState<TimesheetEntry[]>([
    {
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setSelectedUserId(session.user.id); // Set current user as default
        const adminStatus = await checkAdminStatus(session.user.id);
        if (adminStatus) {
          await loadUsers();
        }
        loadTimesheet(session.user.id);
      }
    });
  }, [weekStart]);

  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      console.log("Checking admin status for user:", userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking admin status:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        setIsAdmin(false);
        return false;
      }

      console.log("User role data:", data);
      const adminStatus = data?.role === "admin";
      console.log("Is admin:", adminStatus);
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (err) {
      console.error("Error in checkAdminStatus:", err);
      setIsAdmin(false);
      return false;
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_users_with_roles");

      if (error) {
        console.error("Error loading users:", error);
        return;
      }

      if (data) {
        const userProfiles = data.map((u: any) => ({
          id: u.user_id,
          email: u.email,
        }));
        setUsers(userProfiles);
      }
    } catch (err) {
      console.error("Error in loadUsers:", err);
    }
  };

  const handleUserChange = async (userId: string) => {
    setSelectedUserId(userId);
    setTimesheetId(null);
    setEntries([{
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    }]);
    await loadTimesheet(userId);
  };

  // Check if week has ended and auto-transition
  useEffect(() => {
    const checkWeekEnd = () => {
      const today = new Date();
      if (isAfter(today, weekEnd)) {
        moveToNextWeek();
      }
    };
    checkWeekEnd();
  }, []);

  const loadTimesheet = async (userId: string) => {
    const { data: timesheet } = await supabase
      .from("timesheets")
      .select("*, timesheet_entries(*)")
      .eq("user_id", userId)
      .eq("week_start", format(weekStart, "yyyy-MM-dd"))
      .single();

    // Load approved leave requests for this week
    const { data: leaveRequests } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "approved")
      .gte("end_date", format(weekStart, "yyyy-MM-dd"))
      .lte("start_date", format(weekEnd, "yyyy-MM-dd"));

    // Convert leave requests to timesheet entries
    const leaveEntries: TimesheetEntry[] = [];
    if (leaveRequests && leaveRequests.length > 0) {
      leaveRequests.forEach((leave: any) => {
        // Parse dates and set to start of day for accurate comparison
        const leaveStart = new Date(leave.start_date + 'T00:00:00');
        const leaveEnd = new Date(leave.end_date + 'T23:59:59');
        
        // Calculate hours for each day of the week
        const hours: TimesheetEntry = {
          project: "Leave",
          task: leave.leave_type.toUpperCase() + (leave.reason ? ` - ${leave.reason}` : ''),
          mon_hours: 0,
          tue_hours: 0,
          wed_hours: 0,
          thu_hours: 0,
          fri_hours: 0,
          sat_hours: 0,
          sun_hours: 0,
          source: 'leave',
        };

        // Check each day of the week if it falls within leave period
        for (let i = 0; i < 7; i++) {
          const currentDay = addDays(weekStart, i);
          const currentDayStr = format(currentDay, 'yyyy-MM-dd');
          const leaveStartStr = format(leaveStart, 'yyyy-MM-dd');
          const leaveEndStr = format(leaveEnd, 'yyyy-MM-dd');
          
          // Compare date strings to avoid timezone issues
          if (currentDayStr >= leaveStartStr && currentDayStr <= leaveEndStr) {
            const dayMap = ['mon_hours', 'tue_hours', 'wed_hours', 'thu_hours', 'fri_hours', 'sat_hours', 'sun_hours'];
            const dayKey = dayMap[i] as keyof TimesheetEntry;
            if (dayKey !== 'project' && dayKey !== 'task' && dayKey !== 'id' && dayKey !== 'source') {
              hours[dayKey] = 8; // 8 hours for leave days
            }
          }
        }

        leaveEntries.push(hours);
      });
    }

    if (timesheet) {
      setTimesheetId(timesheet.id);
      if (timesheet.timesheet_entries && timesheet.timesheet_entries.length > 0) {
        const regularEntries = timesheet.timesheet_entries.map((entry: any) => ({
          id: entry.id,
          project: entry.project,
          task: entry.task,
          mon_hours: Number(entry.mon_hours),
          tue_hours: Number(entry.tue_hours),
          wed_hours: Number(entry.wed_hours),
          thu_hours: Number(entry.thu_hours),
          fri_hours: Number(entry.fri_hours),
          sat_hours: Number(entry.sat_hours),
          sun_hours: Number(entry.sun_hours),
          source: entry.source || 'manual',
        }));
        // Combine regular entries with leave entries
        setEntries([...regularEntries, ...leaveEntries]);
      } else {
        // Timesheet exists but has no entries - show leave entries if any
        if (leaveEntries.length > 0) {
          setEntries(leaveEntries);
        } else {
          setEntries([{
            project: "",
            task: "",
            mon_hours: 0,
            tue_hours: 0,
            wed_hours: 0,
            thu_hours: 0,
            fri_hours: 0,
            sat_hours: 0,
            sun_hours: 0,
            source: 'manual',
          }]);
        }
      }
    } else {
      // No timesheet exists for this week - but show leave entries if any
      setTimesheetId(null);
      if (leaveEntries.length > 0) {
        setEntries([...leaveEntries, {
          project: "",
          task: "",
          mon_hours: 0,
          tue_hours: 0,
          wed_hours: 0,
          thu_hours: 0,
          fri_hours: 0,
          sat_hours: 0,
          sun_hours: 0,
          source: 'manual',
        }]);
      } else {
        setEntries([{
          project: "",
          task: "",
          mon_hours: 0,
          tue_hours: 0,
          wed_hours: 0,
          thu_hours: 0,
          fri_hours: 0,
          sat_hours: 0,
          sun_hours: 0,
          source: 'manual',
        }]);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      // Sign out from Supabase (ignore errors as session might already be gone)
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error (ignoring):", error);
    } finally {
      // Always clear storage and redirect, regardless of errors
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error("Storage clear error:", e);
      }
      
      // Force a hard redirect to auth page (clears all state)
      window.location.replace("/auth");
    }
  };

  const addEntry = () => {
    setEntries([
      ...entries,
      {
        project: "",
        task: "",
        mon_hours: 0,
        tue_hours: 0,
        wed_hours: 0,
        thu_hours: 0,
        fri_hours: 0,
        sat_hours: 0,
        sun_hours: 0,
        source: 'manual',
      },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const calculateTotal = (entry: TimesheetEntry) => {
    return (
      entry.mon_hours +
      entry.tue_hours +
      entry.wed_hours +
      entry.thu_hours +
      entry.fri_hours +
      entry.sat_hours +
      entry.sun_hours
    );
  };

  const calculateDayTotal = (day: keyof TimesheetEntry) => {
    return entries.reduce((sum, entry) => sum + (Number(entry[day]) || 0), 0);
  };

  const calculateGrandTotal = () => {
    return entries.reduce((sum, entry) => sum + calculateTotal(entry), 0);
  };

  const formatHours = (hours: number) => {
    return hours % 1 === 0 ? hours.toString() : hours.toFixed(2);
  };

  const moveToNextWeek = () => {
    const newWeekStart = addWeeks(weekStart, 1);
    const newWeekEnd = endOfWeek(newWeekStart, { weekStartsOn: 1 });
    
    // Reset state
    setTimesheetId(null);
    setEntries([{
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    }]);
    
    // Update week - this will trigger useEffect to load timesheet
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);
  };

  const moveToPreviousWeek = () => {
    const newWeekStart = addWeeks(weekStart, -1);
    const newWeekEnd = endOfWeek(newWeekStart, { weekStartsOn: 1 });
    
    // Reset state
    setTimesheetId(null);
    setEntries([{
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    }]);
    
    // Update week - this will trigger useEffect to load timesheet
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);
  };

  const handleShare = async () => {
    if (!timesheetId) {
      toast({
        title: "Error",
        description: "Please save the timesheet first",
        variant: "destructive",
      });
      return;
    }

    const shareUrl = `${window.location.origin}/timesheet/${timesheetId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: " Timesheet",
          text: `Week of ${format(weekStart, "dd MMMM yyyy")} - ${format(weekEnd, "dd MMMM yyyy")}`,
          url: shareUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link Copied",
      description: "Timesheet link copied to clipboard",
    });
  };

  const handleDownload = () => {
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Timesheet', 14, 15);
    
    // Add week info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Week: ${format(weekStart, "dd MMMM yyyy")} - ${format(weekEnd, "dd MMMM yyyy")}`, 14, 22);
    
    // Prepare table data
    const headers = [
      'Project',
      'Task',
      `MON\n${format(addDays(weekStart, 0), "dd MMM")}`,
      `TUE\n${format(addDays(weekStart, 1), "dd MMM")}`,
      `WED\n${format(addDays(weekStart, 2), "dd MMM")}`,
      `THU\n${format(addDays(weekStart, 3), "dd MMM")}`,
      `FRI\n${format(addDays(weekStart, 4), "dd MMM")}`,
      `SAT\n${format(addDays(weekStart, 5), "dd MMM")}`,
      `SUN\n${format(addDays(weekStart, 6), "dd MMM")}`,
      'TOTAL'
    ];
    
    const body: any[] = entries.map(entry => [
      entry.project,
      entry.task,
      formatHours(entry.mon_hours),
      formatHours(entry.tue_hours),
      formatHours(entry.wed_hours),
      formatHours(entry.thu_hours),
      formatHours(entry.fri_hours),
      formatHours(entry.sat_hours),
      formatHours(entry.sun_hours),
      formatHours(calculateTotal(entry))
    ]);
    
    // Add totals row
    body.push([
      { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      formatHours(calculateDayTotal("mon_hours")),
      formatHours(calculateDayTotal("tue_hours")),
      formatHours(calculateDayTotal("wed_hours")),
      formatHours(calculateDayTotal("thu_hours")),
      formatHours(calculateDayTotal("fri_hours")),
      formatHours(calculateDayTotal("sat_hours")),
      formatHours(calculateDayTotal("sun_hours")),
      { content: formatHours(calculateGrandTotal()), styles: { fontStyle: 'bold' } }
    ]);
    
    // Generate table
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 28,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'center', cellWidth: 20 },
        8: { halign: 'center', cellWidth: 20 },
        9: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      },
      didDrawPage: function() {
        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('*Record all time to the nearest 10th of an hour', 14, doc.internal.pageSize.height - 15);
        doc.text('*Overtime is not authorized without Customer Management Approval', 14, doc.internal.pageSize.height - 10);
      }
    });
    
    // Save PDF
    doc.save(`timesheet_${format(weekStart, "yyyy-MM-dd")}.pdf`);
    
    toast({
      title: "Downloaded",
      description: "Timesheet PDF downloaded successfully",
    });
  };

  const saveTimesheet = async (silent = false) => {
    if (!user) return;

    setLoading(true);
    try {
      let currentTimesheetId = timesheetId;

      if (!currentTimesheetId) {
        const { data: newTimesheet, error: timesheetError } = await supabase
          .from("timesheets")
          .insert({
            user_id: user.id,
            week_start: format(weekStart, "yyyy-MM-dd"),
            week_end: format(weekEnd, "yyyy-MM-dd"),
            status: "draft",
          })
          .select()
          .single();

        if (timesheetError) throw timesheetError;
        currentTimesheetId = newTimesheet.id;
        setTimesheetId(currentTimesheetId);
      }

      // Delete only manual entries (preserve time_clock entries)
      await supabase
        .from("timesheet_entries")
        .delete()
        .eq("timesheet_id", currentTimesheetId)
        .eq("source", "manual");

      // Insert new manual entries
      const entriesToInsert = entries
        .filter((entry) => entry.project && entry.task && entry.source !== 'time_clock')
        .map((entry) => ({
          timesheet_id: currentTimesheetId,
          project: entry.project,
          task: entry.task,
          source: 'manual',
          mon_hours: entry.mon_hours,
          tue_hours: entry.tue_hours,
          wed_hours: entry.wed_hours,
          thu_hours: entry.thu_hours,
          fri_hours: entry.fri_hours,
          sat_hours: entry.sat_hours,
          sun_hours: entry.sun_hours,
        }));

      if (entriesToInsert.length > 0) {
        const { error: entriesError } = await supabase
          .from("timesheet_entries")
          .insert(entriesToInsert);

        if (entriesError) throw entriesError;
      }

      if (!silent) {
        toast({
          title: "Success",
          description: "Timesheet saved successfully!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save timesheet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDayDate = (dayIndex: number) => {
    return format(addDays(weekStart, dayIndex), "dd MMMM yyyy");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="TechieMaya Logo" className="h-40 w-auto" />
            <h1 className="text-2xl font-bold">Timesheet</h1>
          </div>
          <div className="flex gap-2">
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
            <Button variant="outline" onClick={() => window.location.href = "/time-clock"}>
              Time Clock
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/leave-calendar"}>
              Leave Calendar
            </Button>
            <Notifications />
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Timesheet</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
            {isAdmin && users.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">
                  View Timesheet For:
                </label>
                <select
                  className="w-full max-w-xs p-2 border rounded-md bg-background"
                  value={selectedUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} {u.id === user?.id && "(You)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-semibold">Beginning Monday: </span>
                  {format(weekStart, "dd MMMM yyyy")}
                </div>
                <div>
                  <span className="font-semibold">Ending Sunday: </span>
                  {format(weekEnd, "dd MMMM yyyy")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={moveToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={moveToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="border border-border bg-muted p-2 text-left font-semibold">
                      Project
                    </th>
                    <th className="border border-border bg-muted p-2 text-left font-semibold">
                      Task
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>MON</div>
                      <div className="text-xs font-normal">{getDayDate(0)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>TUE</div>
                      <div className="text-xs font-normal">{getDayDate(1)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>WED</div>
                      <div className="text-xs font-normal">{getDayDate(2)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>THU</div>
                      <div className="text-xs font-normal">{getDayDate(3)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>FRI</div>
                      <div className="text-xs font-normal">{getDayDate(4)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>SAT</div>
                      <div className="text-xs font-normal">{getDayDate(5)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>SUN</div>
                      <div className="text-xs font-normal">{getDayDate(6)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      TOTAL
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const isTimeClock = entry.source === 'time_clock';
                    const isLeave = entry.source === 'leave';
                    const isReadOnly = isTimeClock || isLeave;
                    return (
                      <tr key={index} className={`hover:bg-muted/50 ${isTimeClock ? 'bg-blue-50/50' : ''} ${isLeave ? 'bg-green-50/50' : ''}`}>
                        <td className="border border-border p-1">
                          {isReadOnly ? (
                            <div className="px-2 py-1 text-sm">{entry.project}</div>
                          ) : (
                            <Input
                              value={entry.project}
                              onChange={(e) =>
                                updateEntry(index, "project", e.target.value)
                              }
                              className="h-8 border-0 bg-transparent"
                              placeholder="Project"
                            />
                          )}
                        </td>
                        <td className="border border-border p-1">
                          {isReadOnly ? (
                            <div className="px-2 py-1 text-sm flex items-center gap-2">
                              {entry.task}
                              {isTimeClock && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Auto</span>}
                              {isLeave && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Leave</span>}
                            </div>
                          ) : (
                            <Input
                              value={entry.task}
                              onChange={(e) => updateEntry(index, "task", e.target.value)}
                              className="h-8 border-0 bg-transparent"
                              placeholder="Task"
                            />
                          )}
                        </td>
                        {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => (
                          <td key={day} className="border border-border p-1">
                            {isReadOnly ? (
                              <div className="text-center text-sm py-1 font-semibold">
                                {isLeave && Number(entry[`${day}_hours` as keyof TimesheetEntry]) > 0 
                                  ? 'PTO' 
                                  : formatHours(Number(entry[`${day}_hours` as keyof TimesheetEntry]) || 0)}
                              </div>
                            ) : (
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={entry[`${day}_hours` as keyof TimesheetEntry] || 0}
                                onChange={(e) =>
                                  updateEntry(
                                    index,
                                    `${day}_hours` as keyof TimesheetEntry,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-8 border-0 bg-transparent text-center"
                              />
                            )}
                          </td>
                        ))}
                        <td className="border border-border p-2 text-center font-semibold">
                          {formatHours(calculateTotal(entry))}
                        </td>
                        <td className="border border-border p-1 text-center">
                          {isReadOnly ? (
                            <div className="text-xs text-muted-foreground">🔒</div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntry(index)}
                              disabled={entries.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted font-semibold">
                    <td colSpan={2} className="border border-border p-2 text-right">
                      TOTAL
                    </td>
                    {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => (
                      <td key={day} className="border border-border p-2 text-center">
                        {formatHours(calculateDayTotal(`${day}_hours` as keyof TimesheetEntry))}
                      </td>
                    ))}
                    <td className="border border-border p-2 text-center">
                      {formatHours(calculateGrandTotal())}
                    </td>
                    <td className="border border-border"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={addEntry} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
              <Button onClick={() => saveTimesheet(false)} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save Timesheet"}
              </Button>
            </div>

            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p>*Record all time to the nearest 10th of an hour</p>
              <p>*Overtime is not authorized without Customer Management Approval</p>
              <div className="mt-4 flex gap-4 items-center">
                <p className="font-semibold text-foreground">Entry Types:</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                  <span className="text-xs">Time Clock (Auto) 🔒</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span className="text-xs">Approved Leave 🔒</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                  <span className="text-xs">Manual Entry (Editable)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Timesheet;

