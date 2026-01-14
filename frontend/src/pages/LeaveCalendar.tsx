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
import { Calendar as CalendarIcon, Check, X, Clock, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from "date-fns";


interface LeaveRequest {
  id: string;
  user_id: string;
  user_email?: string;
  start_date: string;
  end_date: string;
  leave_type: 'pto' | 'sick' | 'vacation' | 'personal' | 'unpaid';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
}

export default function LeaveCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<'pto' | 'sick' | 'vacation' | 'personal' | 'unpaid'>('pto');
  const [reason, setReason] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id) {
        navigate("/auth");
        return;
      }

        setCurrentUser(userData);
        const currentUserResp = await api.auth.getMe() as any;
        const adminStatus = currentUserResp?.user?.role === 'admin';
        setIsAdmin(adminStatus);
        
        await loadMyLeaveRequests(userData.id);
        if (adminStatus) {
          await loadAllLeaveRequests();
        }
      } catch (error) {
        console.error('Error initializing leave calendar:', error);
        navigate("/auth");
      } finally {
      setLoading(false);
      }
    };

    initPage();
  }, [navigate]);

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
        reason: reason || null,
      });

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      setShowRequestDialog(false);
      setSelectedStartDate("");
      setSelectedEndDate("");
      setReason("");
      if (currentUser?.id) {
        await loadMyLeaveRequests(currentUser.id);
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

  const deleteLeaveRequest = async (requestId: string) => {
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
      'pto': 'PTO (Paid Time Off)',
      'sick': 'Sick Leave',
      'vacation': 'Vacation',
      'personal': 'Personal Leave',
      'unpaid': 'Unpaid Leave'
    };
    return labels[type] || type;
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get leave days for calendar highlighting
  const leaveDays = myLeaveRequests
    .filter(req => req.status === 'approved')
    .flatMap(req => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      return eachDayOfInterval({ start, end });
    });

  const isLeaveDay = (date: Date) => {
    return leaveDays.some(leaveDay => 
      format(leaveDay, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Leave Calendar</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <option value="pto">PTO (Paid Time Off)</option>
                <option value="sick">Sick Leave</option>
                <option value="vacation">Vacation</option>
                <option value="personal">Personal Leave</option>
                <option value="unpaid">Unpaid Leave</option>
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
    </div>
  );
}

