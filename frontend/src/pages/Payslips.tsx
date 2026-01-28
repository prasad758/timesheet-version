/**
 * Payslips Page
 * Employee view: View and download own payslips
 * HR/Admin view: Manage all payslips
 * LAD Architecture: Uses SDK hooks only
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { usePayslips, usePayslip, usePayrollMutation } from '@/sdk/features/payroll-pf';
import type { Payslip } from '@/sdk/features/payroll-pf';
import {
  FileText,
  Download,
  Search,
  Calendar,
  RefreshCw,
  Plus,
  Lock,
  Unlock,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';

const Payslips = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState<number | ''>('');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);
    setIsAdmin(userData.role === 'admin' || userData.role === 'hr');
  }, []);

  const filters: any = {
    year: yearFilter,
  };

  if (monthFilter) {
    filters.month = monthFilter;
  }

  if (statusFilter !== 'all') {
    filters.status = statusFilter;
  }

  // Employees can only see their own payslips
  if (!isAdmin) {
    filters.user_id = currentUser?.id;
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
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
                    {payslipDetail.payslip.document_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(payslipDetail.payslip.document_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
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
    </div>
  );
};

/**
 * Create Payslip Dialog Component
 */
import EmployeeDataForm from '@/features/hr-documents/components/EmployeeDataForm';
import { EmployeeData, defaultEmployeeData } from '@/features/hr-documents/types';

const CreatePayslipDialog = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => {
  const [employeeData, setEmployeeData] = useState<EmployeeData>(defaultEmployeeData);
  const mutations = usePayrollMutation();

  const handleSubmit = async () => {
    try {
      await mutations.upsertPayslip.mutateAsync({
        ...employeeData,
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
          {/* Only show template fields for payslip creation */}
          <EmployeeDataForm data={employeeData} onChange={setEmployeeData} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} type="button">Create Payslip</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



export default Payslips;

