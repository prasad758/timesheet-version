/**
 * Payslips Page
 * Employee view: View and download own payslips
 * HR/Admin view: Manage all payslips
 * LAD Architecture: Uses SDK hooks only
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { usePayslips, usePayslip, usePayrollMutation } from '../payroll-pf';
import type { Payslip } from '@/sdk/features/payroll-pf';
import {
  FileText,
  Download,
  Search,
  Calendar,
  RefreshCw,
  Plus,
  Lock,
  Edit,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { generatePayslipPDF } from '../payroll-pf/utils/payslip-pdf-generator';

const Payslips = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [monthFilter, setMonthFilter] = useState<number | ''>('');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState<boolean>(true); // Default to true for admin

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);
    setIsAdmin(userData.role === 'admin' || userData.role === 'hr');
  }, []);

  const filters: any = {};

  // For admin: show upcoming payslips by default, or use year filter if not showing upcoming
  if (isAdmin && showUpcomingOnly) {
    filters.upcoming_only = true;
  } else {
    filters.year = yearFilter;
  }

  if (monthFilter && !showUpcomingOnly) {
    filters.month = monthFilter;
  }

  if (statusFilter !== 'all') {
    filters.status = statusFilter;
  }

  // Employees can only see their own payslips
  if (!isAdmin) {
    filters.user_id = currentUser?.id;
    // Employees see all their payslips (not filtered to upcoming only)
  }

  const { data: payslips = [], isLoading, refetch } = usePayslips(filters);
  const { data: payslipDetail, isLoading: detailLoading } = usePayslip(selectedPayslip);
  const mutations = usePayrollMutation();

  // Filter by search query
  const filteredPayslips = payslips.filter((payslip) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payslip.full_name?.toLowerCase().includes(query) ||
      payslip.email?.toLowerCase().includes(query) ||
      payslip.employee_id?.toLowerCase().includes(query) ||
      payslip.payslip_id?.toLowerCase().includes(query)
    );
  });

  const handleRelease = async (id: string) => {
    try {
      await mutations.releasePayslip.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Payslip released successfully',
      });
      setIsDetailOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to release payslip',
        variant: 'destructive',
      });
    }
  };

  const handleLock = async (id: string) => {
    try {
      await mutations.lockPayslip.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Payslip locked successfully',
      });
      setIsDetailOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to lock payslip',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'locked':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'released':
        return <CheckCircle className="h-4 w-4" />;
      case 'locked':
        return <Lock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payslips</h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Manage employee payslips' : 'View and download your payslips'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Payslip
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {!showUpcomingOnly && (
              <>
                <div>
                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Months</option>
                    {monthNames.map((month, idx) => (
                      <option key={idx} value={idx + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Year"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(parseInt(e.target.value) || new Date().getFullYear())}
                    className="w-full"
                  />
                </div>
              </>
            )}
            {showUpcomingOnly && (
              <div className="col-span-2 flex items-center space-x-2">
                <Label className="text-sm font-medium">Showing: Upcoming 1 Year</Label>
              </div>
            )}
            {isAdmin && (
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="generated">Generated</option>
                  <option value="released">Released</option>
                  <option value="locked">Locked</option>
                </select>
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="upcoming-only"
                  checked={showUpcomingOnly}
                  onChange={(e) => setShowUpcomingOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="upcoming-only" className="text-sm cursor-pointer">
                  Upcoming 1 Year
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredPayslips.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payslips found</p>
            </CardContent>
          </Card>
        ) : (
          filteredPayslips.map((payslip) => (
            <Card
              key={payslip.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedPayslip(payslip.id);
                setIsDetailOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold">
                      {payslip.full_name?.charAt(0) || 'E'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{payslip.full_name || payslip.email}</h3>
                        {payslip.employee_id && (
                          <span className="text-xs text-gray-500">({payslip.employee_id})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {monthNames[payslip.month - 1]} {payslip.year}
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>₹{payslip.net_pay.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            generatePayslipPDF(payslip);
                            toast({
                              title: 'Downloaded',
                              description: 'Payslip PDF downloaded successfully',
                            });
                          } catch (error: any) {
                            toast({
                              title: 'Error',
                              description: error.message || 'Failed to generate PDF',
                              variant: 'destructive',
                            });
                          }
                        }}
                        title="Download Payslip PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(
                          payslip.status
                        )}`}
                      >
                        {getStatusIcon(payslip.status)}
                        <span>{payslip.status.toUpperCase()}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Payslip Detail Dialog */}
      {selectedPayslip && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payslip Details</DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : payslipDetail ? (
              <div className="space-y-6">
                {/* Employee Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Employee Name</Label>
                        <p className="text-sm font-medium">{payslipDetail.payslip.full_name || payslipDetail.payslip.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Employee ID</Label>
                        <p className="text-sm font-medium">{payslipDetail.payslip.employee_id || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Payslip ID</Label>
                        <p className="text-sm font-medium">{payslipDetail.payslip.payslip_id || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Period</Label>
                        <p className="text-sm font-medium">
                          {monthNames[payslipDetail.payslip.month - 1]} {payslipDetail.payslip.year}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Earnings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Basic Pay</span>
                        <span className="text-sm font-medium">₹{payslipDetail.payslip.basic_pay.toLocaleString()}</span>
                      </div>
                      {payslipDetail.payslip.hra > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">HRA</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.hra.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.special_allowance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Special Allowance</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.special_allowance.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Bonus</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.bonus.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.incentives > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Incentives</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.incentives.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.other_earnings > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Other Earnings</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.other_earnings.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t font-semibold">
                        <span>Total Earnings</span>
                        <span>₹{payslipDetail.payslip.total_earnings.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Deductions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Deductions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {payslipDetail.payslip.pf_employee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">PF (Employee)</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.pf_employee.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.pf_employer > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">PF (Employer)</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.pf_employer.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.esi_employee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">ESI (Employee)</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.esi_employee.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.esi_employer > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">ESI (Employer)</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.esi_employer.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.professional_tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Professional Tax</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.professional_tax.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.tds > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">TDS</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.tds.toLocaleString()}</span>
                        </div>
                      )}
                      {payslipDetail.payslip.other_deductions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Other Deductions</span>
                          <span className="text-sm font-medium">₹{payslipDetail.payslip.other_deductions.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t font-semibold">
                        <span>Total Deductions</span>
                        <span>₹{payslipDetail.payslip.total_deductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Net Pay */}
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Net Pay</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{payslipDetail.payslip.net_pay.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    {/* Download PDF - Always visible */}
                    <Button
                      variant="default"
                      onClick={() => {
                        try {
                          generatePayslipPDF(payslipDetail.payslip);
                          toast({
                            title: 'Downloaded',
                            description: 'Payslip PDF downloaded successfully',
                          });
                        } catch (error: any) {
                          toast({
                            title: 'Error',
                            description: error.message || 'Failed to generate PDF',
                            variant: 'destructive',
                          });
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    
                    {payslipDetail.payslip.document_url && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (payslipDetail.payslip.document_url) {
                            window.open(payslipDetail.payslip.document_url, '_blank');
                          }
                        }}
                        title="Open existing PDF document"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                    )}
                    
                    {isAdmin && payslipDetail.payslip.status === 'generated' && (
                      <Button
                        onClick={() => handleRelease(payslipDetail.payslip.id)}
                        variant="default"
                        disabled={mutations.releasePayslip.isPending}
                      >
                        {mutations.releasePayslip.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Releasing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Release Payslip
                          </>
                        )}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        onClick={() => {
                          setEditingPayslip(payslipDetail.payslip);
                          setIsEditOpen(true);
                          setIsDetailOpen(false);
                        }}
                        variant="outline"
                        title={payslipDetail.payslip.is_locked ? 'Admin can edit locked payslips' : ''}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Payslip {payslipDetail.payslip.is_locked && '(Locked)'}
                      </Button>
                    )}
                    {isAdmin && payslipDetail.payslip.status === 'released' && !payslipDetail.payslip.is_locked && (
                      <Button
                        onClick={() => handleLock(payslipDetail.payslip.id)}
                        variant="outline"
                        disabled={mutations.lockPayslip.isPending}
                      >
                        {mutations.lockPayslip.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Locking...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Lock Payslip
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Failed to load payslip details</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Create Payslip Dialog (Admin/HR only) */}
      {isAdmin && (
        <CreatePayslipDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            refetch();
          }}
        />
      )}

      {/* Edit Payslip Dialog (Admin/HR only) */}
      {isAdmin && editingPayslip && (
        <EditPayslipDialog
          isOpen={isEditOpen}
          payslip={editingPayslip}
          onClose={() => {
            setIsEditOpen(false);
            setEditingPayslip(null);
          }}
          onSuccess={() => {
            setIsEditOpen(false);
            setEditingPayslip(null);
            refetch();
            if (selectedPayslip) {
              // Refresh the detail view
              setSelectedPayslip(null);
              setTimeout(() => {
                setSelectedPayslip(editingPayslip.id);
                setIsDetailOpen(true);
              }, 100);
            }
          }}
        />
      )}
    </div>
  );
};

/**
 * Create Payslip Dialog Component
 */
const CreatePayslipDialog = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => {
  const [payslipForm, setPayslipForm] = useState({
    user_id: '',
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_pay: '',
    hra: '',
    special_allowance: '',
    bonus: '',
    incentives: '',
    other_earnings: '',
    pf_employee: '',
    pf_employer: '',
    esi_employee: '',
    esi_employer: '',
    professional_tax: '',
    tds: '',
    other_deductions: '',
    company_name: '',
    company_address: '',
    issue_date: new Date().toISOString().split('T')[0],
  });

  const mutations = usePayrollMutation();

  const handleSubmit = async () => {
    if (!payslipForm.user_id || !payslipForm.basic_pay) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate UUID format for user_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payslipForm.user_id)) {
      toast({
        title: 'Error',
        description: 'User ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)',
        variant: 'destructive',
      });
      return;
    }

    // Validate employee_id if provided - it must be a valid UUID or empty
    let employeeId = undefined;
    if (payslipForm.employee_id && payslipForm.employee_id.trim() !== '') {
      if (!uuidRegex.test(payslipForm.employee_id)) {
        toast({
          title: 'Error',
          description: 'Employee ID must be a valid UUID format or left empty. Employee numbers are not supported here.',
          variant: 'destructive',
        });
        return;
      }
      employeeId = payslipForm.employee_id;
    }

    try {
      await mutations.upsertPayslip.mutateAsync({
        user_id: payslipForm.user_id,
        employee_id: employeeId,
        month: payslipForm.month,
        year: payslipForm.year,
        basic_pay: parseFloat(payslipForm.basic_pay),
        hra: payslipForm.hra ? parseFloat(payslipForm.hra) : 0,
        special_allowance: payslipForm.special_allowance ? parseFloat(payslipForm.special_allowance) : 0,
        bonus: payslipForm.bonus ? parseFloat(payslipForm.bonus) : 0,
        incentives: payslipForm.incentives ? parseFloat(payslipForm.incentives) : 0,
        other_earnings: payslipForm.other_earnings ? parseFloat(payslipForm.other_earnings) : 0,
        pf_employee: payslipForm.pf_employee ? parseFloat(payslipForm.pf_employee) : 0,
        pf_employer: payslipForm.pf_employer ? parseFloat(payslipForm.pf_employer) : 0,
        esi_employee: payslipForm.esi_employee ? parseFloat(payslipForm.esi_employee) : 0,
        esi_employer: payslipForm.esi_employer ? parseFloat(payslipForm.esi_employer) : 0,
        professional_tax: payslipForm.professional_tax ? parseFloat(payslipForm.professional_tax) : 0,
        tds: payslipForm.tds ? parseFloat(payslipForm.tds) : 0,
        other_deductions: payslipForm.other_deductions ? parseFloat(payslipForm.other_deductions) : 0,
        company_name: payslipForm.company_name || undefined,
        company_address: payslipForm.company_address || undefined,
        issue_date: payslipForm.issue_date || undefined,
        status: 'generated',
      });

      toast({
        title: 'Success',
        description: 'Payslip created successfully',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payslip',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payslip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_id">User ID *</Label>
              <Input
                id="user_id"
                value={payslipForm.user_id}
                onChange={(e) => setPayslipForm({ ...payslipForm, user_id: e.target.value })}
                placeholder="UUID"
              />
            </div>
            <div>
              <Label htmlFor="employee_id">Employee ID (Optional - UUID format)</Label>
              <Input
                id="employee_id"
                value={payslipForm.employee_id}
                onChange={(e) => setPayslipForm({ ...payslipForm, employee_id: e.target.value })}
                placeholder="UUID format (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if not needed. Must be a valid UUID if provided.
              </p>
            </div>
            <div>
              <Label htmlFor="month">Month *</Label>
              <Input
                id="month"
                type="number"
                min="1"
                max="12"
                value={payslipForm.month}
                onChange={(e) => setPayslipForm({ ...payslipForm, month: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                max="2100"
                value={payslipForm.year}
                onChange={(e) => setPayslipForm({ ...payslipForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Earnings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basic_pay">Basic Pay *</Label>
                <Input
                  id="basic_pay"
                  type="number"
                  step="0.01"
                  value={payslipForm.basic_pay}
                  onChange={(e) => setPayslipForm({ ...payslipForm, basic_pay: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hra">HRA</Label>
                <Input
                  id="hra"
                  type="number"
                  step="0.01"
                  value={payslipForm.hra}
                  onChange={(e) => setPayslipForm({ ...payslipForm, hra: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="special_allowance">Special Allowance</Label>
                <Input
                  id="special_allowance"
                  type="number"
                  step="0.01"
                  value={payslipForm.special_allowance}
                  onChange={(e) => setPayslipForm({ ...payslipForm, special_allowance: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bonus">Bonus</Label>
                <Input
                  id="bonus"
                  type="number"
                  step="0.01"
                  value={payslipForm.bonus}
                  onChange={(e) => setPayslipForm({ ...payslipForm, bonus: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="incentives">Incentives</Label>
                <Input
                  id="incentives"
                  type="number"
                  step="0.01"
                  value={payslipForm.incentives}
                  onChange={(e) => setPayslipForm({ ...payslipForm, incentives: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="other_earnings">Other Earnings</Label>
                <Input
                  id="other_earnings"
                  type="number"
                  step="0.01"
                  value={payslipForm.other_earnings}
                  onChange={(e) => setPayslipForm({ ...payslipForm, other_earnings: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Deductions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pf_employee">PF (Employee)</Label>
                <Input
                  id="pf_employee"
                  type="number"
                  step="0.01"
                  value={payslipForm.pf_employee}
                  onChange={(e) => setPayslipForm({ ...payslipForm, pf_employee: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pf_employer">PF (Employer)</Label>
                <Input
                  id="pf_employer"
                  type="number"
                  step="0.01"
                  value={payslipForm.pf_employer}
                  onChange={(e) => setPayslipForm({ ...payslipForm, pf_employer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="esi_employee">ESI (Employee)</Label>
                <Input
                  id="esi_employee"
                  type="number"
                  step="0.01"
                  value={payslipForm.esi_employee}
                  onChange={(e) => setPayslipForm({ ...payslipForm, esi_employee: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="esi_employer">ESI (Employer)</Label>
                <Input
                  id="esi_employer"
                  type="number"
                  step="0.01"
                  value={payslipForm.esi_employer}
                  onChange={(e) => setPayslipForm({ ...payslipForm, esi_employer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="professional_tax">Professional Tax</Label>
                <Input
                  id="professional_tax"
                  type="number"
                  step="0.01"
                  value={payslipForm.professional_tax}
                  onChange={(e) => setPayslipForm({ ...payslipForm, professional_tax: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tds">TDS</Label>
                <Input
                  id="tds"
                  type="number"
                  step="0.01"
                  value={payslipForm.tds}
                  onChange={(e) => setPayslipForm({ ...payslipForm, tds: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="other_deductions">Other Deductions</Label>
                <Input
                  id="other_deductions"
                  type="number"
                  step="0.01"
                  value={payslipForm.other_deductions}
                  onChange={(e) => setPayslipForm({ ...payslipForm, other_deductions: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Company Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={payslipForm.company_name}
                  onChange={(e) => setPayslipForm({ ...payslipForm, company_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={payslipForm.issue_date}
                  onChange={(e) => setPayslipForm({ ...payslipForm, issue_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="company_address">Company Address</Label>
                <Input
                  id="company_address"
                  value={payslipForm.company_address}
                  onChange={(e) => setPayslipForm({ ...payslipForm, company_address: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutations.upsertPayslip.isPending}
          >
            {mutations.upsertPayslip.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Payslip
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Edit Payslip Dialog Component
 */
const EditPayslipDialog = ({ 
  isOpen, 
  payslip, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  payslip: Payslip; 
  onClose: () => void; 
  onSuccess: () => void 
}) => {
  const [payslipForm, setPayslipForm] = useState({
    user_id: payslip.user_id || '',
    employee_id: payslip.employee_id || '',
    month: payslip.month || new Date().getMonth() + 1,
    year: payslip.year || new Date().getFullYear(),
    basic_pay: payslip.basic_pay?.toString() || '',
    hra: payslip.hra?.toString() || '',
    special_allowance: payslip.special_allowance?.toString() || '',
    bonus: payslip.bonus?.toString() || '',
    incentives: payslip.incentives?.toString() || '',
    other_earnings: payslip.other_earnings?.toString() || '',
    pf_employee: payslip.pf_employee?.toString() || '',
    pf_employer: payslip.pf_employer?.toString() || '',
    esi_employee: payslip.esi_employee?.toString() || '',
    esi_employer: payslip.esi_employer?.toString() || '',
    professional_tax: payslip.professional_tax?.toString() || '',
    tds: payslip.tds?.toString() || '',
    other_deductions: payslip.other_deductions?.toString() || '',
    company_name: payslip.company_name || '',
    company_address: payslip.company_address || '',
    issue_date: payslip.issue_date ? new Date(payslip.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const mutations = usePayrollMutation();

  // Update form when payslip changes
  useEffect(() => {
    if (payslip) {
      setPayslipForm({
        user_id: payslip.user_id || '',
        employee_id: payslip.employee_id || '',
        month: payslip.month || new Date().getMonth() + 1,
        year: payslip.year || new Date().getFullYear(),
        basic_pay: payslip.basic_pay?.toString() || '',
        hra: payslip.hra?.toString() || '',
        special_allowance: payslip.special_allowance?.toString() || '',
        bonus: payslip.bonus?.toString() || '',
        incentives: payslip.incentives?.toString() || '',
        other_earnings: payslip.other_earnings?.toString() || '',
        pf_employee: payslip.pf_employee?.toString() || '',
        pf_employer: payslip.pf_employer?.toString() || '',
        esi_employee: payslip.esi_employee?.toString() || '',
        esi_employer: payslip.esi_employer?.toString() || '',
        professional_tax: payslip.professional_tax?.toString() || '',
        tds: payslip.tds?.toString() || '',
        other_deductions: payslip.other_deductions?.toString() || '',
        company_name: payslip.company_name || '',
        company_address: payslip.company_address || '',
        issue_date: payslip.issue_date ? new Date(payslip.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      });
    }
  }, [payslip]);

  const handleSubmit = async () => {
    if (!payslipForm.user_id || !payslipForm.basic_pay) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate UUID format for user_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payslipForm.user_id)) {
      toast({
        title: 'Error',
        description: 'User ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)',
        variant: 'destructive',
      });
      return;
    }

    // Validate employee_id if provided - it must be a valid UUID or empty
    let employeeId = undefined;
    if (payslipForm.employee_id && payslipForm.employee_id.trim() !== '') {
      if (!uuidRegex.test(payslipForm.employee_id)) {
        toast({
          title: 'Error',
          description: 'Employee ID must be a valid UUID format or left empty. Employee numbers are not supported here.',
          variant: 'destructive',
        });
        return;
      }
      employeeId = payslipForm.employee_id;
    }

    try {
      await mutations.upsertPayslip.mutateAsync({
        id: payslip.id, // Include ID for update
        user_id: payslipForm.user_id,
        employee_id: employeeId,
        month: payslipForm.month,
        year: payslipForm.year,
        basic_pay: parseFloat(payslipForm.basic_pay),
        hra: payslipForm.hra ? parseFloat(payslipForm.hra) : 0,
        special_allowance: payslipForm.special_allowance ? parseFloat(payslipForm.special_allowance) : 0,
        bonus: payslipForm.bonus ? parseFloat(payslipForm.bonus) : 0,
        incentives: payslipForm.incentives ? parseFloat(payslipForm.incentives) : 0,
        other_earnings: payslipForm.other_earnings ? parseFloat(payslipForm.other_earnings) : 0,
        pf_employee: payslipForm.pf_employee ? parseFloat(payslipForm.pf_employee) : 0,
        pf_employer: payslipForm.pf_employer ? parseFloat(payslipForm.pf_employer) : 0,
        esi_employee: payslipForm.esi_employee ? parseFloat(payslipForm.esi_employee) : 0,
        esi_employer: payslipForm.esi_employer ? parseFloat(payslipForm.esi_employer) : 0,
        professional_tax: payslipForm.professional_tax ? parseFloat(payslipForm.professional_tax) : 0,
        tds: payslipForm.tds ? parseFloat(payslipForm.tds) : 0,
        other_deductions: payslipForm.other_deductions ? parseFloat(payslipForm.other_deductions) : 0,
        company_name: payslipForm.company_name || undefined,
        company_address: payslipForm.company_address || undefined,
        issue_date: payslipForm.issue_date || undefined,
        // Keep existing status
        status: payslip.status,
      });

      toast({
        title: 'Success',
        description: 'Payslip updated successfully',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payslip',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payslip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_user_id">User ID *</Label>
              <Input
                id="edit_user_id"
                value={payslipForm.user_id}
                onChange={(e) => setPayslipForm({ ...payslipForm, user_id: e.target.value })}
                placeholder="UUID"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">User ID cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="edit_employee_id">Employee ID (Optional - UUID format)</Label>
              <Input
                id="edit_employee_id"
                value={payslipForm.employee_id}
                onChange={(e) => setPayslipForm({ ...payslipForm, employee_id: e.target.value })}
                placeholder="UUID format (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if not needed. Must be a valid UUID if provided.
              </p>
            </div>
            <div>
              <Label htmlFor="edit_month">Month *</Label>
              <Input
                id="edit_month"
                type="number"
                min="1"
                max="12"
                value={payslipForm.month}
                onChange={(e) => setPayslipForm({ ...payslipForm, month: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="edit_year">Year *</Label>
              <Input
                id="edit_year"
                type="number"
                min="2000"
                max="2100"
                value={payslipForm.year}
                onChange={(e) => setPayslipForm({ ...payslipForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Earnings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_basic_pay">Basic Pay *</Label>
                <Input
                  id="edit_basic_pay"
                  type="number"
                  step="0.01"
                  value={payslipForm.basic_pay}
                  onChange={(e) => setPayslipForm({ ...payslipForm, basic_pay: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_hra">HRA</Label>
                <Input
                  id="edit_hra"
                  type="number"
                  step="0.01"
                  value={payslipForm.hra}
                  onChange={(e) => setPayslipForm({ ...payslipForm, hra: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_special_allowance">Special Allowance</Label>
                <Input
                  id="edit_special_allowance"
                  type="number"
                  step="0.01"
                  value={payslipForm.special_allowance}
                  onChange={(e) => setPayslipForm({ ...payslipForm, special_allowance: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_bonus">Bonus</Label>
                <Input
                  id="edit_bonus"
                  type="number"
                  step="0.01"
                  value={payslipForm.bonus}
                  onChange={(e) => setPayslipForm({ ...payslipForm, bonus: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_incentives">Incentives</Label>
                <Input
                  id="edit_incentives"
                  type="number"
                  step="0.01"
                  value={payslipForm.incentives}
                  onChange={(e) => setPayslipForm({ ...payslipForm, incentives: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_other_earnings">Other Earnings</Label>
                <Input
                  id="edit_other_earnings"
                  type="number"
                  step="0.01"
                  value={payslipForm.other_earnings}
                  onChange={(e) => setPayslipForm({ ...payslipForm, other_earnings: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Deductions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_pf_employee">PF (Employee)</Label>
                <Input
                  id="edit_pf_employee"
                  type="number"
                  step="0.01"
                  value={payslipForm.pf_employee}
                  onChange={(e) => setPayslipForm({ ...payslipForm, pf_employee: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_pf_employer">PF (Employer)</Label>
                <Input
                  id="edit_pf_employer"
                  type="number"
                  step="0.01"
                  value={payslipForm.pf_employer}
                  onChange={(e) => setPayslipForm({ ...payslipForm, pf_employer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_esi_employee">ESI (Employee)</Label>
                <Input
                  id="edit_esi_employee"
                  type="number"
                  step="0.01"
                  value={payslipForm.esi_employee}
                  onChange={(e) => setPayslipForm({ ...payslipForm, esi_employee: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_esi_employer">ESI (Employer)</Label>
                <Input
                  id="edit_esi_employer"
                  type="number"
                  step="0.01"
                  value={payslipForm.esi_employer}
                  onChange={(e) => setPayslipForm({ ...payslipForm, esi_employer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_professional_tax">Professional Tax</Label>
                <Input
                  id="edit_professional_tax"
                  type="number"
                  step="0.01"
                  value={payslipForm.professional_tax}
                  onChange={(e) => setPayslipForm({ ...payslipForm, professional_tax: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_tds">TDS</Label>
                <Input
                  id="edit_tds"
                  type="number"
                  step="0.01"
                  value={payslipForm.tds}
                  onChange={(e) => setPayslipForm({ ...payslipForm, tds: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_other_deductions">Other Deductions</Label>
                <Input
                  id="edit_other_deductions"
                  type="number"
                  step="0.01"
                  value={payslipForm.other_deductions}
                  onChange={(e) => setPayslipForm({ ...payslipForm, other_deductions: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Company Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_company_name">Company Name</Label>
                <Input
                  id="edit_company_name"
                  value={payslipForm.company_name}
                  onChange={(e) => setPayslipForm({ ...payslipForm, company_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_issue_date">Issue Date</Label>
                <Input
                  id="edit_issue_date"
                  type="date"
                  value={payslipForm.issue_date}
                  onChange={(e) => setPayslipForm({ ...payslipForm, issue_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit_company_address">Company Address</Label>
                <Input
                  id="edit_company_address"
                  value={payslipForm.company_address}
                  onChange={(e) => setPayslipForm({ ...payslipForm, company_address: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutations.upsertPayslip.isPending}
          >
            {mutations.upsertPayslip.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Update Payslip
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Payslips;

