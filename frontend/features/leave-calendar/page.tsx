import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Check, X, Clock, Plus, BarChart3, ClipboardList } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";

// Helper function to get current financial year (April to March)
const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11 (0 = January)
  const currentYear = today.getFullYear();
  
  // If current month is January to March (0-2), FY started in previous year
  // If current month is April to December (3-11), FY started in current year
  if (currentMonth < 3) {
    return `${currentYear - 1}-${currentYear}`;
  } else {
    return `${currentYear}-${currentYear + 1}`;
  }
};

// Helper function to display financial year in "April 1, YYYY to March 31, YYYY" format
const getFinancialYearDisplay = (financialYear?: string) => {
  const fy = financialYear || getCurrentFinancialYear();
  const [startYear, endYear] = fy.split('-').map(Number);
  return `April 1, ${startYear} to March 31, ${endYear}`;
};

// Tab type
type TabType = 'calendar' | 'balance' | 'shifts' | 'attendance';

interface LeaveRequest {
  id: string;
  user_id: string;
  user_email?: string;
  user_full_name?: string;
  start_date: string;
  end_date: string;
  leave_type: 'Casual Leave' | 'Privilege Leave' | 'Sick Leave' | 'Unpaid Leave' | 'Compensatory Off';
  session?: 'Full Day' | 'First Half' | 'Second Half';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
}

interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type: string;
  financial_year: string;
  opening_balance: number;
  availed: number;
  balance: number;
  lapse: number;
  lapse_date: string | null;
}

interface ShiftRoster {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  date: string;
  shift_type: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  date: string;
  shift_type?: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

export default function LeaveCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Debug - render immediately to check if component mounts
  console.log('🔵 LeaveCalendar component MOUNTED');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  
  // Leave Balance state
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  // Selected user for viewing balances (admin feature)
  const [selectedBalanceUserId, setSelectedBalanceUserId] = useState<string>('');
  // Selected user for viewing attendance (admin feature)
  const [selectedAttendanceUserId, setSelectedAttendanceUserId] = useState<string>('');
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    user_id: '',
    leave_type: 'Casual Leave',
    financial_year: getCurrentFinancialYear(),
    opening_balance: 0,
    availed: 0,
    balance: 0,
    lapse: 0,
  });
  
  // Shift Roster state
  const [shiftRoster, setShiftRoster] = useState<ShiftRoster[]>([]);
  const [shiftWeekStart, setShiftWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    user_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    shift_type: 'General Shift',
    start_time: '11:00',
    end_time: '20:00',
  });
  
  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date());
  const [attendanceWeekStart, setAttendanceWeekStart] = useState(null);
  const [attendanceViewMode, setAttendanceViewMode] = useState<'month' | 'week'>('month');
  
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<
    'Casual Leave' | 'Privilege Leave' | 'Sick Leave' | 'Unpaid Leave' | 'Compensatory Off'
  >('Casual Leave');
  const [session, setSession] = useState<'Full Day' | 'First Half' | 'Second Half'>('Full Day');
  const [reason, setReason] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('Leave Calendar - User data:', userData);
        
        if (!userData.id) {
          console.log('Leave Calendar - No user ID, redirecting to auth');
          navigate("/auth");
          return;
        }

        setCurrentUser(userData);
        const currentUserResp = await api.auth.getMe() as any;
        console.log('Leave Calendar - Current user response:', currentUserResp);
        
        // Check admin status from API response or localStorage
        const adminStatus = currentUserResp?.user?.role === 'admin' || userData?.role === 'admin';
        setIsAdmin(adminStatus);
        
        await loadMyLeaveRequests(userData.id);
        await loadLeaveBalances();
        
        // Always load all leave requests for admin to see pending approvals
        if (adminStatus) {
          await loadAllLeaveRequests();
          await loadAllUsers();
        }
      } catch (error) {
        console.error('Error initializing leave calendar:', error);
        toast({
          title: "Error",
          description: "Failed to load leave calendar. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [navigate]);

  // Load shift roster when week changes
  useEffect(() => {
    if (isAdmin && activeTab === 'shifts') {
      loadShiftRoster();
    }
  }, [shiftWeekStart, isAdmin, activeTab]);

  // Load attendance when month changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance();
    }
  }, [attendanceMonth, activeTab]);

  // Load leave balances when selected user changes (for admin)
  useEffect(() => {
    if (activeTab === 'balance') {
      loadLeaveBalances(selectedBalanceUserId || undefined);
    }
  }, [selectedBalanceUserId, activeTab]);

  const loadAllUsers = async () => {
    try {
      const response = await api.users.getAll() as any;
      setAllUsers(response.users || response || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadLeaveBalances = async (userId?: string) => {
    try {
      let response;
      if (userId && isAdmin) {
        // Admin viewing another user's balance
        response = await api.leaveCalendar.getBalancesForUser(userId) as any;
      } else {
        // User viewing their own balance
        response = await api.leaveCalendar.getBalances() as any;
      }
      setLeaveBalances(response.leave_balances || []);
    } catch (error) {
      console.error("Error loading leave balances:", error);
      setLeaveBalances([]);
    }
  };

  const loadShiftRoster = async () => {
    try {
      const weekEnd = endOfWeek(shiftWeekStart, { weekStartsOn: 1 });
      const response = await api.leaveCalendar.getShifts(
        format(shiftWeekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      ) as any;
      setShiftRoster(response.shift_roster || []);
    } catch (error) {
      console.error("Error loading shift roster:", error);
      setShiftRoster([]);
    }
  };

  const loadAttendance = async () => {
    try {
      const monthStart = startOfMonth(attendanceMonth);
      const monthEnd = endOfMonth(attendanceMonth);
      const response = await api.leaveCalendar.getAttendance(
        format(monthStart, 'yyyy-MM-dd'),
        format(monthEnd, 'yyyy-MM-dd')
      ) as any;
      setAttendance(response.attendance_records || response.attendance || []);
    } catch (error) {
      console.error("Error loading attendance:", error);
      setAttendance([]);
    }
  };

  const loadMyLeaveRequests = async (userId: string) => {
    try {
      const response = await api.leave.getAll() as any;
      const allRequests = response.leave_requests || response || [];
      // Filter to only current user's requests
      const myRequests = allRequests.filter((req: any) => req.user_id === userId);
      setMyLeaveRequests(myRequests);
    } catch (error) {
      console.error("Error loading leave requests:", error);
      setMyLeaveRequests([]);
    }
  };

  const loadAllLeaveRequests = async () => {
    try {
      const response = await api.leave.getAll() as any;
      const allRequests = response.leave_requests || response || [];
      setAllLeaveRequests(allRequests);
    } catch (error) {
      console.error("Error loading all leave requests:", error);
      setAllLeaveRequests([]);
    }
  };

  const updateLeaveBalance = async () => {
    if (!balanceForm.user_id) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.leaveCalendar.updateBalance({
        user_id: balanceForm.user_id,
        leave_type: balanceForm.leave_type,
        financial_year: balanceForm.financial_year,
        opening_balance: balanceForm.opening_balance,
        availed: balanceForm.availed,
        balance: balanceForm.opening_balance - balanceForm.availed,
        lapse: balanceForm.lapse,
      });

      toast({
        title: "Success",
        description: "Leave balance updated successfully",
      });
      setShowBalanceDialog(false);
      await loadLeaveBalances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateShiftRoster = async () => {
    if (!shiftForm.user_id) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.leaveCalendar.updateShift({
        user_id: shiftForm.user_id,
        date: shiftForm.date,
        shift_type: shiftForm.shift_type,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
      });

      toast({
        title: "Success",
        description: "Shift assigned successfully",
      });
      setShowShiftDialog(false);
      await loadShiftRoster();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update shift",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'half_day': return 'bg-yellow-100 text-yellow-800';
      case 'on_leave': return 'bg-blue-100 text-blue-800';
      case 'upcoming': return 'bg-gray-50 text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const createLeaveRequest = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(selectedEndDate) < new Date(selectedStartDate)) {
      toast({
        title: "Error",
        description: "End date must be after or equal to start date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await api.leave.create({
        start_date: selectedStartDate,
        end_date: selectedEndDate,
        leave_type: leaveType,
        session: session,
        reason: reason || null,
      });

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      setShowRequestDialog(false);
      setSelectedStartDate("");
      setSelectedEndDate("");
      setLeaveType('Casual Leave');
      setSession('Full Day');
      setReason("");
      if (currentUser?.id) {
        await loadMyLeaveRequests(currentUser.id);
        if (isAdmin) {
          await loadAllLeaveRequests();
        }
    }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create leave request",
        variant: "destructive",
      });
    } finally {
    setLoading(false);
    }
  };

  const updateLeaveStatus = async (requestId: string, newStatus: 'approved' | 'rejected', adminNotes?: string) => {
    setLoading(true);

    try {
      await api.leave.updateStatus(requestId, newStatus, adminNotes);

      toast({
        title: "Success",
        description: `Leave request ${newStatus}`,
      });
      await loadAllLeaveRequests();
      if (currentUser) {
        await loadMyLeaveRequests(currentUser.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteLeaveRequest = async (_requestId: string) => {
    // TODO: Add delete endpoint to API
      toast({
      title: "Coming Soon",
      description: "Delete functionality will be available soon",
      variant: "default",
      });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'Casual Leave': 'Casual Leave',
      'Privilege Leave': 'Privilege Leave',
      'Sick Leave': 'Sick Leave',
      'Unpaid Leave': 'Unpaid Leave',
      'Compensatory Off': 'Compensatory Off'
    };
    return labels[type] || type;
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = monthStart.getDay();
  
  // Create empty cells for days before the first of the month
  const emptyDays = Array(startDayOfWeek).fill(null);

  // Get leave days for calendar highlighting
  const leaveDays = myLeaveRequests
    .filter(req => req.status === 'approved')
    .flatMap(req => {
      // Parse dates as local time to avoid timezone issues
      const startDateStr = req.start_date.split('T')[0];
      const endDateStr = req.end_date.split('T')[0];
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      return eachDayOfInterval({ start, end });
    });

  const isLeaveDay = (date: Date) => {
    return leaveDays.some(leaveDay => 
      format(leaveDay, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  if (loading) {
    console.log('Leave Calendar - Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave calendar...</p>
        </div>
      </div>
    );
  }

  console.log('Leave Calendar - Rendering main content', {
    isAdmin,
    activeTab,
    myLeaveRequestsCount: myLeaveRequests.length,
    attendanceCount: attendance.length
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Leave & Attendance</h1>
          {isAdmin && <p className="text-sm text-blue-600 mt-1">Admin View - You can manage leave, balances, shifts, and attendance</p>}
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 border-b">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'calendar' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            Leave Calendar
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'balance' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Leave Balance
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('shifts')}
              className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'shifts' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-4 w-4" />
              Shift Roster
            </button>
          )}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'attendance' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Attendance
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'calendar' && (
          <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : ''} gap-6`}>
            {/* Calendar View */}
            <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  >
                    Next
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-sm py-2">
                      {day}
                    </div>
                  ))}
                  {/* Empty cells for days before the first of the month */}
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="text-center py-3"></div>
                  ))}
                  {monthDays.map(day => {
                    const isLeave = isLeaveDay(day);
                    const isPast = isBefore(day, startOfDay(new Date()));
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          text-center py-3 rounded-lg border
                          ${isToday(day) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                          ${isLeave ? 'bg-green-100 border-green-300' : ''}
                          ${!isSameMonth(day, currentMonth) ? 'text-gray-400' : ''}
                          ${isPast ? 'opacity-50' : ''}
                        `}
                      >
                        <div className="text-sm">{format(day, 'd')}</div>
                        {isLeave && (
                          <div className="text-xs text-green-600 font-medium">PTO</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* My Leave Requests */}
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Leave Requests</CardTitle>
                <Button onClick={() => setShowRequestDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Leave
                </Button>
              </CardHeader>
              <CardContent>
                {myLeaveRequests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No leave requests yet</p>
                ) : (
                  <div className="space-y-3">
                    {myLeaveRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`border rounded-lg p-4 ${getStatusColor(request.status)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{getLeaveTypeLabel(request.leave_type)}</h3>
                              <span className="text-xs uppercase px-2 py-1 rounded border">
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm mt-1">
                              {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                            </p>
                            {request.reason && (
                              <p className="text-sm mt-2">Reason: {request.reason}</p>
                            )}
                            {request.admin_notes && (
                              <p className="text-sm mt-2 italic">Admin Notes: {request.admin_notes}</p>
                            )}
                          </div>
                          {request.status === 'pending' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteLeaveRequest(request.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Admin Panel */}
          {isAdmin && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  {allLeaveRequests.filter(r => r.status === 'pending').length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending requests</p>
                  ) : (
                    <div className="space-y-3">
                      {allLeaveRequests
                        .filter(r => r.status === 'pending')
                        .map((request) => (
                          <div key={request.id} className="border rounded-lg p-3">
                            <p className="font-semibold text-sm">{request.user_email}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {getLeaveTypeLabel(request.leave_type)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                            </p>
                            {request.reason && (
                              <p className="text-xs text-gray-600 mt-1">{request.reason}</p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => updateLeaveStatus(request.id, 'approved')}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => updateLeaveStatus(request.id, 'rejected')}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        )}

        {/* Leave Balance Tab */}
        {activeTab === 'balance' && (
          <div className="space-y-6">
            {/* User Selector for Admin */}
            {isAdmin && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700">View Balance For:</label>
                    <select
                      value={selectedBalanceUserId}
                      onChange={(e) => setSelectedBalanceUserId(e.target.value)}
                      className="border rounded-md px-3 py-2 min-w-[250px]"
                    >
                      <option value="">My Balance</option>
                      {allUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.full_name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leave Balance Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {selectedBalanceUserId 
                    ? `${allUsers.find((u: any) => u.id === selectedBalanceUserId)?.full_name || 'User'}'s Leave Balance (${getFinancialYearDisplay()})`
                    : `My Leave Balance (${getFinancialYearDisplay()})`
                  }
                </CardTitle>
                {isAdmin && (
                  <Button onClick={() => setShowBalanceDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Set Balance
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left font-semibold">Leave Type</th>
                        <th className="border p-3 text-center font-semibold">Opening Balance</th>
                        <th className="border p-3 text-center font-semibold">Availed</th>
                        <th className="border p-3 text-center font-semibold">Balance</th>
                        <th className="border p-3 text-center font-semibold">Lapse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Casual Leave', 'Privilege Leave', 'Sick Leave'].map(type => {
                        const balance = leaveBalances.find(b => b.leave_type === type && b.financial_year === getCurrentFinancialYear());
                        return (
                          <tr key={type} className="hover:bg-gray-50">
                            <td className="border p-3 font-medium">{type}</td>
                            <td className="border p-3 text-center">{balance?.opening_balance || 0}</td>
                            <td className="border p-3 text-center text-orange-600">{balance?.availed || 0}</td>
                            <td className="border p-3 text-center font-semibold text-green-600">{balance?.balance || 0}</td>
                            <td className="border p-3 text-center text-red-600">{balance?.lapse || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  * Unpaid Leave and Compensatory Off are not tracked in balance
                </p>
              </CardContent>
            </Card>

            {/* Leave Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Available</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {leaveBalances.reduce((sum, b) => sum + (b.balance || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500">days remaining</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Used</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {leaveBalances.reduce((sum, b) => sum + (b.availed || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500">days taken</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Pending Requests</p>
                    <p className="text-3xl font-bold text-green-600">
                      {myLeaveRequests.filter(r => r.status === 'pending').length}
                    </p>
                    <p className="text-xs text-gray-500">awaiting approval</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Shift Roster Tab (Admin Only) */}
        {activeTab === 'shifts' && isAdmin && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Shift Roster - Week of {format(shiftWeekStart, 'MMM d, yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShiftWeekStart(addDays(shiftWeekStart, -7))}
                  >
                    Previous Week
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShiftWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShiftWeekStart(addDays(shiftWeekStart, 7))}
                  >
                    Next Week
                  </Button>
                  <Button onClick={() => setShowShiftDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Shift
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left font-semibold">Employee</th>
                        {[0, 1, 2, 3, 4, 5, 6].map(i => (
                          <th key={i} className="border p-3 text-center font-semibold">
                            <div>{format(addDays(shiftWeekStart, i), 'EEE')}</div>
                            <div className="text-xs font-normal">{format(addDays(shiftWeekStart, i), 'MMM d')}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="border p-4 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        allUsers.map(user => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="border p-3 font-medium">{user.full_name || user.email}</td>
                            {[0, 1, 2, 3, 4, 5, 6].map(i => {
                              const dayStr = format(addDays(shiftWeekStart, i), 'yyyy-MM-dd');
                              const shift = shiftRoster.find(s => s.user_id === user.id && s.date.split('T')[0] === dayStr);
                              return (
                                <td key={i} className="border p-2 text-center text-sm">
                                  {shift ? (
                                    <div className={`px-2 py-1 rounded ${shift.shift_type === 'General Shift' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                      <div className="font-medium">{shift.shift_type === 'General Shift' ? 'General' : 'Second'}</div>
                                      <div className="text-xs">{shift.start_time} - {shift.end_time}</div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Shift Legend */}
                <div className="mt-4 flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 rounded"></div>
                    <span className="text-sm">General Shift (11:00 - 20:00)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 rounded"></div>
                    <span className="text-sm">Second Shift (12:00 - 21:00)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* User Selector for Admin */}
            {isAdmin && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700">View Attendance For:</label>
                    <select
                      value={selectedAttendanceUserId}
                      onChange={(e) => setSelectedAttendanceUserId(e.target.value)}
                      className="border rounded-md px-3 py-2 min-w-[250px]"
                    >
                      <option value="">All Employees</option>
                      {allUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.full_name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Attendance - {format(attendanceMonth, 'MMMM yyyy')}
                  {selectedAttendanceUserId && ` - ${allUsers.find((u: any) => u.id === selectedAttendanceUserId)?.full_name || 'User'}`}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={attendanceViewMode === 'month' ? 'default' : 'outline'}
                    onClick={() => setAttendanceViewMode('month')}
                  >
                    This Month
                  </Button>
                  <Button
                    variant={attendanceViewMode === 'week' ? 'default' : 'outline'}
                    onClick={() => {
                      setAttendanceViewMode('week');
                      const today = new Date();
                      const start = new Date(today);
                      start.setDate(today.getDate() - today.getDay()); // Sunday
                      setAttendanceWeekStart(start);
                    }}
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAttendanceMonth(new Date(attendanceMonth.setMonth(attendanceMonth.getMonth() - 1)))}
                  >
                    Previous Month
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAttendanceMonth(new Date(attendanceMonth.setMonth(attendanceMonth.getMonth() + 1)))}
                  >
                    Next Month
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Attendance Summary */}
                {(() => {
                  let filteredAttendance = attendance.filter(a => {
                    if (!isAdmin) return a.user_id === currentUser?.id;
                    if (selectedAttendanceUserId) return a.user_id === selectedAttendanceUserId;
                    return true;
                  });
                  // Hide upcoming days (future dates)
                  const today = new Date();
                  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  filteredAttendance = filteredAttendance.filter(a => {
                    const d = new Date(a.date);
                    return d <= todayOnly;
                  });
                  if (attendanceViewMode === 'week' && attendanceWeekStart) {
                    const weekStart = new Date(attendanceWeekStart);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    filteredAttendance = filteredAttendance.filter(a => {
                      const d = new Date(a.date);
                      return d >= weekStart && d <= weekEnd && d <= todayOnly;
                    });
                  }
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {filteredAttendance.filter(a => a.status === 'present').length}
                        </p>
                        <p className="text-sm text-gray-600">Present</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {filteredAttendance.filter(a => a.status === 'absent').length}
                        </p>
                        <p className="text-sm text-gray-600">Absent</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {filteredAttendance.filter(a => a.status === 'half_day').length}
                        </p>
                        <p className="text-sm text-gray-600">Half Day</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {filteredAttendance.filter(a => a.status === 'on_leave').length}
                        </p>
                        <p className="text-sm text-gray-600">On Leave</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Attendance Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left font-semibold">Date</th>
                        {isAdmin && <th className="border p-3 text-left font-semibold">Employee</th>}
                        <th className="border p-3 text-center font-semibold">Status</th>
                        <th className="border p-3 text-center font-semibold">Shift</th>
                        <th className="border p-3 text-center font-semibold">Clock In</th>
                        <th className="border p-3 text-center font-semibold">Clock Out</th>
                        <th className="border p-3 text-center font-semibold">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 7 : 6} className="border p-4 text-center text-gray-500">
                            No attendance records found for this month
                          </td>
                        </tr>
                      ) : (
                        attendance
                          .filter(a => {
                            if (!isAdmin) return a.user_id === currentUser?.id;
                            if (selectedAttendanceUserId) return a.user_id === selectedAttendanceUserId;
                            return true; // Show all for admin when no user selected
                          })
                          .map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="border p-3">{format(new Date(record.date), 'EEE, MMM d')}</td>
                              {isAdmin && <td className="border p-3">{record.full_name || record.email}</td>}
                              <td className="border p-3 text-center">
                                {record.status === 'upcoming' || !record.status ? (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getAttendanceStatusColor(record.status)}`}> </span>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getAttendanceStatusColor(record.status)}`}>
                                    {record.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td className="border p-3 text-center text-sm">{record.shift_type || '-'}</td>
                              <td className="border p-3 text-center text-sm">
                                {record.clock_in ? format(new Date(record.clock_in), 'HH:mm') : '-'}
                              </td>
                              <td className="border p-3 text-center text-sm">
                                {record.clock_out ? format(new Date(record.clock_out), 'HH:mm') : '-'}
                              </td>
                              <td className="border p-3 text-center font-medium">
                                {typeof record.total_hours === 'number' && !isNaN(record.total_hours) ? record.total_hours.toFixed(1) : '-'}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Request Leave Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>
              Select the dates and type of leave you need
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date *</Label>
              <Input
                id="end-date"
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                min={selectedStartDate || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label htmlFor="leave-type">Leave Type *</Label>
              <select
                id="leave-type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Privilege Leave">Privilege Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
                <option value="Compensatory Off">Compensatory Off</option>
              </select>
            </div>
            <div>
              <Label htmlFor="session">Session *</Label>
              <select
                id="session"
                value={session}
                onChange={(e) => setSession(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="Full Day">Full Day</option>
                <option value="First Half">First Half (Session 1)</option>
                <option value="Second Half">Second Half (Session 2)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for your leave..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createLeaveRequest} disabled={loading}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Leave Balance Dialog (Admin) */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Leave Balance</DialogTitle>
            <DialogDescription>
              Configure leave balance for an employee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="balance-user">Employee *</Label>
              <select
                id="balance-user"
                value={balanceForm.user_id}
                onChange={(e) => setBalanceForm({ ...balanceForm, user_id: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Employee</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="balance-type">Leave Type *</Label>
              <select
                id="balance-type"
                value={balanceForm.leave_type}
                onChange={(e) => setBalanceForm({ ...balanceForm, leave_type: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Privilege Leave">Privilege Leave</option>
                <option value="Sick Leave">Sick Leave</option>
              </select>
            </div>
            <div>
              <Label htmlFor="balance-fy">Financial Year *</Label>
              <select
                id="balance-fy"
                value={balanceForm.financial_year}
                onChange={(e) => setBalanceForm({ ...balanceForm, financial_year: e.target.value })}
                className="w-full p-2 border rounded"
              >
                {(() => {
                  const currentFY = getCurrentFinancialYear();
                  const [startYear] = currentFY.split('-').map(Number);
                  return (
                    <>
                      <option value={currentFY}>{getFinancialYearDisplay(currentFY)}</option>
                      <option value={`${startYear - 1}-${startYear}`}>{getFinancialYearDisplay(`${startYear - 1}-${startYear}`)}</option>
                    </>
                  );
                })()}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="opening-balance">Opening Balance</Label>
                <Input
                  id="opening-balance"
                  type="number"
                  min="0"
                  value={balanceForm.opening_balance}
                  onChange={(e) => setBalanceForm({ ...balanceForm, opening_balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="availed">Availed</Label>
                <Input
                  id="availed"
                  type="number"
                  min="0"
                  value={balanceForm.availed}
                  onChange={(e) => setBalanceForm({ ...balanceForm, availed: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="lapse">Lapse (days to expire)</Label>
              <Input
                id="lapse"
                type="number"
                min="0"
                value={balanceForm.lapse}
                onChange={(e) => setBalanceForm({ ...balanceForm, lapse: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBalanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateLeaveBalance} disabled={loading}>
              Save Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog (Admin) */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Shift</DialogTitle>
            <DialogDescription>
              Assign a shift to an employee for a specific date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="shift-user">Employee *</Label>
              <select
                id="shift-user"
                value={shiftForm.user_id}
                onChange={(e) => setShiftForm({ ...shiftForm, user_id: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Employee</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="shift-date">Date *</Label>
              <Input
                id="shift-date"
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="shift-type">Shift Type *</Label>
              <select
                id="shift-type"
                value={shiftForm.shift_type}
                onChange={(e) => {
                  const type = e.target.value;
                  setShiftForm({ 
                    ...shiftForm, 
                    shift_type: type,
                    start_time: type === 'General Shift' ? '11:00' : '12:00',
                    end_time: type === 'General Shift' ? '20:00' : '21:00'
                  });
                }}
                className="w-full p-2 border rounded"
              >
                <option value="General Shift">General Shift (11:00 - 20:00)</option>
                <option value="Second Shift">Second Shift (12:00 - 21:00)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateShiftRoster} disabled={loading}>
              Assign Shift            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}