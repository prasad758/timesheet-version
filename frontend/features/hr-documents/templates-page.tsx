import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Eye, Download, User, ChevronRight, Search, Trash2 } from 'lucide-react';

interface TemplateItem {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name?: string;
  employee_name?: string;
  name?: string;
  email?: string;
  personal_email?: string;
  job_title?: string;
  designation?: string;
  department?: string;
  join_date?: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  phone?: string;
  address?: string;
  salary?: string;
  reporting_manager?: string;
  manager_name?: string;
  company_name?: string;
  employee_id?: string;
  emergency_contact?: string;
}

interface EmployeeData {
  employee_name: string;
  employee_id: string;
  designation: string;
  department: string;
  date_of_joining: string;
  date_of_leaving: string;
  salary: string;
  address: string;
  email: string;
  phone: string;
  manager_name: string;
  company_name: string;
}

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch templates on mount
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/hr-documents/templates`);
        const json = await resp.json();
        if (json.success) setTemplates(json.templates || []);
      } catch (e) {
        console.error('Failed to load templates', e);
      }
    })();
  }, []);

  // Fetch employees/profiles on mount (with auth)
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
        console.log('[Templates] Profiles response:', json);
        const list = json.profiles || json.users || json || [];
        setEmployees(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Failed to load employees', e);
      }
    })();
  }, []);

  // Map selected employee to EmployeeData shape
  const employeeData: EmployeeData = useMemo(() => {
    if (!selectedEmployee) {
      return {
        employee_name: '', employee_id: '', designation: '', department: '',
        date_of_joining: '', date_of_leaving: '', salary: '', address: '',
        email: '', phone: '', manager_name: '', company_name: '',
      };
    }
    return {
      employee_name: selectedEmployee.full_name || selectedEmployee.employee_name || selectedEmployee.name || '',
      employee_id: selectedEmployee.employee_id || selectedEmployee.id || '',
      designation: selectedEmployee.job_title || selectedEmployee.designation || '',
      department: selectedEmployee.department || '',
      date_of_joining: selectedEmployee.join_date || selectedEmployee.date_of_joining || '',
      date_of_leaving: selectedEmployee.date_of_leaving || '',
      salary: selectedEmployee.salary || '',
      address: selectedEmployee.address || '',
      email: selectedEmployee.email || selectedEmployee.personal_email || '',
      phone: selectedEmployee.phone || '',
      manager_name: selectedEmployee.reporting_manager || selectedEmployee.manager_name || '',
      company_name: selectedEmployee.company_name || 'TechieMaya FZE',
    };
  }, [selectedEmployee]);

  // Load preview when template + employee selected
  useEffect(() => {
    if (!selectedTemplate) {
      setPreviewHtml(null);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(`${API_BASE}/hr-documents/generate/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: selectedTemplate.id, data: employeeData }),
        });
        const json = await resp.json();
        if (json.success) setPreviewHtml(json.html || null);
        else setPreviewHtml(null);
      } catch (e) {
        console.error('Preview failed', e);
        setPreviewHtml(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTemplate, employeeData]);

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?`)) return;
    
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
      });
      const json = await resp.json();
      if (json.success) {
        // Remove from templates list
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        // If currently selected template was deleted, clear it
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
          setPreviewHtml(null);
        }
      } else {
        alert(json.error || 'Failed to delete template');
      }
    } catch (e) {
      console.error('Delete error', e);
      alert('Failed to delete template');
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedTemplate) return;
    try {
      const resp = await fetch(`${API_BASE}/hr-documents/generate/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate.id, data: employeeData }),
      });
      if (!resp.ok) {
        alert('PDF generation failed');
        return;
      }
      const blob = await resp.blob();
      const filename = resp.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error', e);
      alert('PDF download failed');
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">HR Templates</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Select a template, choose an employee, then preview and download.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: template list */}
        <div className="lg:col-span-1 bg-white border rounded-lg p-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
          </div>
          {filteredTemplates.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No templates found.</p>
          ) : (
            <ul className="space-y-1">
              {filteredTemplates.map((t) => (
                <li
                  key={t.id}
                  className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 ${selectedTemplate?.id === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <button
                    onClick={() => setSelectedTemplate(t)}
                    className="flex items-center gap-2 flex-1 cursor-pointer text-left"
                  >
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm truncate flex-1">{t.name}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id, t.name); }}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Middle: employee selection + actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4" /> Select Employee
            </h3>
            <select
              className="w-full border rounded p-2"
              value={selectedEmployee?.id || ''}
              onChange={(e) => {
                const emp = employees.find((x) => String(x.id) === e.target.value) || null;
                setSelectedEmployee(emp);
              }}
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || emp.employee_name || emp.name || emp.email || emp.id}
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <div className="bg-white border rounded-lg p-4 text-sm space-y-1">
              <h4 className="font-medium mb-2">Employee Details</h4>
              <p><span className="text-gray-500">Name:</span> {employeeData.employee_name}</p>
              <p><span className="text-gray-500">ID:</span> {employeeData.employee_id}</p>
              <p><span className="text-gray-500">Designation:</span> {employeeData.designation}</p>
              <p><span className="text-gray-500">Department:</span> {employeeData.department}</p>
              <p><span className="text-gray-500">Joining:</span> {employeeData.date_of_joining}</p>
              <p><span className="text-gray-500">Email:</span> {employeeData.email}</p>
            </div>
          )}

          {selectedTemplate && (
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPdf}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="lg:col-span-1 bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-100 border-b px-4 py-2 flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500">Loading preview...</p>
            ) : previewHtml ? (
              <div
                className="prose prose-sm max-w-none"
                style={{ fontFamily: 'Times New Roman, serif', fontSize: '11pt' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-sm text-gray-400 italic">
                {selectedTemplate ? 'Select an employee to preview merged document.' : 'Select a template to begin.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;
