import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Download, User, FileText, Trash2 } from 'lucide-react';
import DocumentPreview, { UploadedTemplate, EmployeeData } from './components/DocumentPreview';

interface Employee {
  id: string;
  employee_name?: string;
  name?: string;
  full_name?: string;
  email?: string;
  personal_email?: string;
  designation?: string;
  job_title?: string;
  department?: string;
  date_of_joining?: string;
  join_date?: string;
  date_of_leaving?: string;
  phone?: string;
  address?: string;
  salary?: string;
  manager_name?: string;
  reporting_manager?: string;
  company_name?: string;
  employee_id?: string;
}

const dummyEmployee: EmployeeData = {
  employee_name: '',
  employee_id: '',
  designation: '',
  department: '',
  date_of_joining: '',
  date_of_leaving: '',
  salary: '',
    // date_of_ending removed
  email: '',
  phone: '',
  manager_name: '',
  company_name: '',
};

const HRDocumentsPage: React.FC = () => {
  const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';

  // Helper function to format date without timezone (YYYY-MM-DD)
  const formatDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    } catch {
      return dateStr;
    }
  };

  const [template, setTemplate] = useState<UploadedTemplate | null>(null);
  const [templatesList, setTemplatesList] = useState<UploadedTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Editable employee data (so preview can show actual values)
  const [employeeData, setEmployeeData] = useState<EmployeeData>({
    employee_name: '',
    employee_id: '',
    designation: '',
    department: '',
    date_of_joining: '',
    date_of_leaving: '',
    salary: '',
      // date_of_ending removed
    email: '',
    phone: '',
    manager_name: '',
    company_name: '',
  });

  // Fetch employees on mount (with auth token)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch(`${API_BASE}/profiles`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        const json = await resp.json();
        console.log('[HR Documents] Profiles response:', json);
        const list = json.profiles || json.users || json || [];
        setEmployees(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Failed to load employees', e);
      }
    })();
  }, [API_BASE]);

  // Fetch templates list on mount
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/hr-documents/templates`);
        const json = await resp.json();
        if (json.success) {
          setTemplatesList(json.templates || []);
        }
      } catch (e) {
        console.error('Failed to load templates', e);
      }
    })();
  }, [API_BASE]);

  // Handle template selection from dropdown
  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) {
      setTemplate(null);
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/templates/${encodeURIComponent(templateId)}`);
      const json = await resp.json();
      if (json.success && json.template) {
        const t: UploadedTemplate = {
          id: json.template.id || templateId,
          name: json.template.originalname || json.template.name || templateId,
          type: (json.template.format || 'html').toLowerCase(),
          previewHtml: json.template.html || json.template.previewHtml || null,
        };
        setTemplate(t);
      }
    } catch (e) {
      console.error('Failed to load template', e);
    }
  };

  // When an employee is selected, populate the form
  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find((x) => String(x.id) === empId) || null;
    setSelectedEmployee(emp);
    if (emp) {
      setEmployeeData({
        employee_name: emp.full_name || emp.employee_name || emp.name || '',
        employee_id: emp.employee_id || emp.id || '',
        designation: emp.job_title || emp.designation || '',
        department: emp.department || '',
        date_of_joining: formatDate(emp.join_date || emp.date_of_joining),
        date_of_leaving: formatDate(emp.date_of_leaving),
        salary: emp.salary || '',
        address: emp.address || '',
        email: emp.email || emp.personal_email || '',
        phone: emp.phone || '',
        manager_name: emp.reporting_manager || emp.manager_name || '',
        company_name: emp.company_name || 'TechieMaya FZE',
      });
    }
  };

  // Fetch merged preview from backend when template + employeeData changes
  const [mergedPreviewHtml, setMergedPreviewHtml] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{ hasPlaceholders: boolean; placeholders: string[]; message: string } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced fetch function for preview
  const fetchPreview = useCallback(async (templateId: string, data: EmployeeData) => {
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/generate/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, data }),
      });
      const json = await resp.json();
      if (json.success) {
        setMergedPreviewHtml(json.html || null);
        setPreviewInfo({
          hasPlaceholders: json.hasPlaceholders || false,
          placeholders: json.placeholders || [],
          message: json.message || ''
        });
      } else {
        setMergedPreviewHtml(null);
        setPreviewInfo(null);
      }
    } catch (e) {
      console.error('Preview fetch failed', e);
      setMergedPreviewHtml(null);
      setPreviewInfo(null);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (!template?.id) {
      setMergedPreviewHtml(null);
      setPreviewInfo(null);
      return;
    }
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce API call by 300ms for smooth typing
    debounceTimerRef.current = setTimeout(() => {
      fetchPreview(template.id!, employeeData);
    }, 300);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [template?.id, employeeData, fetchPreview]);

  // Build a template object with merged preview for DocumentPreview component
  const templateForPreview = useMemo<UploadedTemplate | null>(() => {
    if (!template) return null;
    return { ...template, previewHtml: mergedPreviewHtml || template.previewHtml };
  }, [template, mergedPreviewHtml]);

  // Simple upload state for this page
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<string>('payslip');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    setUploadFile(f || null);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadMessage({ type: 'error', text: 'Please select a file to upload.' });
      return;
    }

    const fd = new FormData();
    fd.append('template', uploadFile);
    fd.append('documentType', uploadDocType);
    fd.append('name', uploadFile.name.replace(/\.[^/.]+$/, ''));

    try {
      setUploading(true);
      setUploadMessage(null);

      const resp = await fetch(`${API_BASE}/hr-documents/templates/upload`, { method: 'POST', body: fd });
      const data = await resp.json();

      if (data.success) {
        setUploadMessage({ type: 'success', text: 'Uploaded and analyzed successfully.' });
        setUploadFile(null);

        // Refresh templates list
        try {
          const listResp = await fetch(`${API_BASE}/hr-documents/templates`);
          const listJson = await listResp.json();
          if (listJson.success) setTemplatesList(listJson.templates || []);
        } catch (e) {
          console.warn('Failed to refresh templates list', e);
        }

        // Load details for the uploaded template (backend returns meta.filename)
        const newId = data.meta?.filename || data.meta?.id || null;
        if (newId) {
          try {
            const detailResp = await fetch(`${API_BASE}/hr-documents/templates/${encodeURIComponent(newId)}`);
            const detailJson = await detailResp.json();
            if (detailJson.success && detailJson.template) {
              const t: UploadedTemplate = {
                id: detailJson.template.id || newId,
                name: detailJson.template.originalname || detailJson.template.name || newId,
                type: (detailJson.template.format || 'html').toLowerCase(),
                previewHtml: detailJson.template.html || detailJson.template.previewHtml || null,
              };
              setTemplate(t);
            }
          } catch (e) {
            console.warn('Failed to load uploaded template details', e);
          }
        }
      } else {
        setUploadMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (err) {
      console.error(err);
      setUploadMessage({ type: 'error', text: 'Upload failed. See console for details.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!template?.id) return;
    if (!confirm(`Are you sure you want to delete "${template.name || template.id}"?`)) return;
    
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/templates/${encodeURIComponent(template.id)}`, {
        method: 'DELETE',
      });
      const json = await resp.json();
      if (json.success) {
        // Remove from templates list
        setTemplatesList(prev => prev.filter(t => t.id !== template.id));
        setTemplate(null);
        setMergedPreviewHtml(null);
        setPreviewInfo(null);
        setUploadMessage({ type: 'success', text: 'Template deleted successfully' });
      } else {
        alert(json.error || 'Failed to delete template');
      }
    } catch (e) {
      console.error('Delete error', e);
      alert('Failed to delete template');
    }
  };

  const handleDeleteTemplateById = async (templateId: string, templateName?: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName || templateId}"?`)) return;
    
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
      });
      const json = await resp.json();
      if (json.success) {
        // Remove from templates list
        setTemplatesList(prev => prev.filter(t => t.id !== templateId));
        // If currently selected template was deleted, clear it
        if (template?.id === templateId) {
          setTemplate(null);
          setMergedPreviewHtml(null);
          setPreviewInfo(null);
        }
        setUploadMessage({ type: 'success', text: 'Template deleted successfully' });
      } else {
        alert(json.error || 'Failed to delete template');
      }
    } catch (e) {
      console.error('Delete error', e);
      alert('Failed to delete template');
    }
  };

  const handleDownloadPdf = async () => {
    if (!template?.id) return;
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/generate/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, data: employeeData }),
      });
      if (!resp.ok) {
        alert('PDF generation failed');
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(template.name || 'document').replace(/\.[^.]+$/, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error', e);
      alert('PDF download failed');
    }
  };

  // Refresh preview by re-fetching template content
  const handleRefreshPreview = async () => {
    if (!template?.id) return;
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/templates/${template.id}`);
      const data = await resp.json();
      if (data.success && data.template) {
        setTemplate(data.template);
        setMergedPreviewHtml(null); // Reset to trigger re-merge
      }
    } catch (e) {
      console.error('Refresh error', e);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">HR Documents</h1>
          <p className="text-sm text-muted-foreground">Manage document templates and generate merged documents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[50%_50%] gap-6">
        {/* Left: actions + upload + employee form */}
        <div>
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-2">Upload Template</h4>
            <label className="block text-sm text-gray-700 mb-1">Document Type</label>
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              className="block w-full rounded-md border-gray-300 mb-3"
            >
              <option value="payslip">Employee Payslip</option>
              <option value="offer_letter">Offer Letter</option>
              <option value="appointment_letter">Appointment Letter</option>
              <option value="experience_letter">Experience Letter</option>
              <option value="relieving_letter">Relieving Letter</option>
              <option value="asset_allocation">Asset Allocation Form</option>
              <option value="asset_handover">Asset Handover Form</option>
              <option value="id_card">ID Card Details</option>
              <option value="exit_clearance">Exit/Clearance Form</option>
              <option value="pf_statement">PF Statement</option>
              <option value="salary_breakup">Salary Breakup Statement</option>
            </select>

            <label className="block text-sm text-gray-700 mb-1">Template File</label>
            <input type="file" onChange={handleFileChange} className="block w-full mb-3" />

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload Template'}
            </button>

            {uploadMessage && (
              <div className={`mt-3 p-2 rounded ${uploadMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {uploadMessage.text}
              </div>
            )}
          </div>

          {/* Employee Selection */}
          <div className="mt-6 bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4" /> Select Employee
            </h4>
            <select
              className="w-full border rounded p-2 mb-4"
              value={selectedEmployee?.id || ''}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_name || emp.full_name || emp.name || emp.email || emp.id}
                </option>
              ))}
            </select>

            <h4 className="font-medium mb-2">Employee Data (editable)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Employee name" value={employeeData.employee_name} onChange={(e) => setEmployeeData({...employeeData, employee_name: e.target.value})} className="p-2 border rounded" />
              <input placeholder="Employee ID" value={employeeData.employee_id} onChange={(e) => setEmployeeData({...employeeData, employee_id: e.target.value})} className="p-2 border rounded" />
              <input placeholder="Designation" value={employeeData.designation} onChange={(e) => setEmployeeData({...employeeData, designation: e.target.value})} className="p-2 border rounded" />
              <input placeholder="Department" value={employeeData.department} onChange={(e) => setEmployeeData({...employeeData, department: e.target.value})} className="p-2 border rounded" />
              <input placeholder="Date of joining" value={employeeData.date_of_joining} onChange={(e) => setEmployeeData({...employeeData, date_of_joining: e.target.value})} className="p-2 border rounded" />
              <input placeholder="Date of leaving" value={employeeData.date_of_leaving || ''} onChange={(e) => setEmployeeData({...employeeData, date_of_leaving: e.target.value})} className="p-2 border rounded" />
                {/* Date of Ending field removed */}
              <input placeholder="Email" value={employeeData.email} onChange={(e) => setEmployeeData({...employeeData, email: e.target.value})} className="p-2 border rounded" />
              <input placeholder="Phone" value={employeeData.phone} onChange={(e) => setEmployeeData({...employeeData, phone: e.target.value})} className="p-2 border rounded" />
            </div>
          </div>

          {/* Template Selection */}
          <div className="mt-6 bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Select Template
            </h4>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded p-2"
                value={template?.id || ''}
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                <option value="">-- Select Template --</option>
                {templatesList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </select>
              {template && (
                <button
                  onClick={handleDeleteTemplate}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 flex items-center gap-1"
                  title="Delete this template"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Templates list with delete */}
            {templatesList.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto border rounded">
                {templatesList.map((t) => (
                  <div 
                    key={t.id} 
                    className={`flex items-center justify-between p-2 hover:bg-gray-50 border-b last:border-b-0 ${template?.id === t.id ? 'bg-blue-50' : ''}`}
                  >
                    <button
                      onClick={() => handleTemplateSelect(t.id)}
                      className="flex-1 text-left text-sm truncate"
                    >
                      {t.name || t.id}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplateById(t.id, t.name)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: preview */}
        <aside className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-2">Document Preview</h3>
            <p className="text-sm text-muted-foreground">Live preview of merged document using the current employee data.</p>
            {previewInfo && (
              <div className={`mt-3 p-2 rounded text-xs ${previewInfo.hasPlaceholders ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                {previewInfo.hasPlaceholders ? (
                  <>✅ Template has {previewInfo.placeholders.length} placeholder(s): {previewInfo.placeholders.slice(0, 5).join(', ')}{previewInfo.placeholders.length > 5 ? '...' : ''}</>
                ) : (
                  <>⚠️ This template has no placeholders (hardcoded). Employee data shown for reference only.</>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-white border rounded-lg overflow-hidden max-h-[calc(100vh-14rem)] overflow-y-auto">
            {template ? (
              <DocumentPreview template={templateForPreview} employeeData={employeeData} onDownloadPdf={handleDownloadPdf} onRefresh={handleRefreshPreview} />
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Select a template to see the preview</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HRDocumentsPage;

