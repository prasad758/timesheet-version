import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import DocumentPreview from './DocumentPreview';

// Document Types
const DOCUMENT_TYPES = [
  { value: 'payslip', label: 'Employee Payslip' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'appointment_letter', label: 'Appointment Letter' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'relieving_letter', label: 'Relieving Letter' },
  { value: 'asset_allocation', label: 'Asset Allocation Form' },
  { value: 'asset_handover', label: 'Asset Handover Form' },
  { value: 'id_card', label: 'ID Card Details' },
  { value: 'exit_clearance', label: 'Exit/Clearance Form' },
  { value: 'pf_statement', label: 'PF Statement' },
  { value: 'salary_breakup', label: 'Salary Breakup Statement' },
];

const OUTPUT_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word (DOCX)' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'html', label: 'HTML' },
];

interface EmployeeData {
  employeeName: string;
  employeeId: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  dateOfLeaving?: string;
  grossSalary: number;
  email?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  pan?: string;
  uan?: string;
}

interface Template {
  id: string;
  name: string;
  documentType: string;
  format: string;
  createdAt: string;
}

interface ExtendedEmployeeData extends EmployeeData {
  dateOfLeaving?: string;
  reasonForLeaving?: string;
  gender?: string;
  companyName?: string;
  hrName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  useNumberedFormat?: boolean;
}

interface HRDocumentGeneratorProps {
  currencySymbol?: string;
  maxUploadSizeMB?: number;
  supportedFormats?: string[];
  defaultGender?: string;
  defaultReasonForLeaving?: string;
  companyNamePlaceholder?: string;
}

export const HRDocumentGenerator: React.FC<HRDocumentGeneratorProps> = ({
  currencySymbol = '₹',
  maxUploadSizeMB = 10,
  supportedFormats,
  defaultGender = '',
  defaultReasonForLeaving = '',
  companyNamePlaceholder = '',
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'templates' | 'upload'>('generate');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('payslip');
  const [outputFormat, setOutputFormat] = useState<string>('pdf');
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTemplateInfo, setSelectedTemplateInfo] = useState<any>(null);

  const [employeeData, setEmployeeData] = useState<ExtendedEmployeeData>({
    employeeName: '',
    employeeId: '',
    designation: '',
    department: '',
    dateOfJoining: '',
    grossSalary: 0,
    dateOfLeaving: '',
    reasonForLeaving: defaultReasonForLeaving,
    gender: defaultGender,
    companyName: companyNamePlaceholder,
    useNumberedFormat: false,
  });

  const [salaryBreakup, setSalaryBreakup] = useState<any>(null);

  const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

  // Fetch templates when documentType or activeTab changes.
  // When viewing the Templates tab we want the full unfiltered list,
  // otherwise fetch templates scoped to the selected documentType.
  React.useEffect(() => {
    fetchTemplates();
  }, [documentType, activeTab]);

  // Fetch template details when selected
  const fetchTemplateDetails = async (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateInfo(null);
      return;
    }
    try {
      const response = await fetch(`${apiBase}/api/hr-documents/templates/${templateId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedTemplateInfo(data.template);
        // Auto-enable numbered format if template uses it
        if (data.template.structure?.letterFormat?.hasNumberedList) {
          setEmployeeData(prev => ({ ...prev, useNumberedFormat: true }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch template details:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';
      let url = `${apiBase}/api/hr-documents/templates`;
      if (activeTab !== 'templates' && documentType) {
        const params = new URLSearchParams();
        params.set('documentType', documentType);
        url = `${apiBase}/api/hr-documents/templates?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  // Template upload dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('template', file);
    formData.append('documentType', documentType);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

    setLoading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);
      const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/hr-documents/templates/upload`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(70);
      const data = await response.json();
      
      if (data.success) {
        const extractedInfo = data.extractedInfo;
        let successMsg = 'Template uploaded and analyzed successfully!';
        
        // Show what was learned from the template
        if (extractedInfo?.documentType) {
          successMsg += ` Detected type: ${extractedInfo.documentType}.`;
        }
        if (extractedInfo?.companyInfo?.name) {
          successMsg += ` Company: ${extractedInfo.companyInfo.name}.`;
        }
        if (extractedInfo?.employeeFields?.length > 0) {
          successMsg += ` Found ${extractedInfo.employeeFields.length} employee fields.`;
        }
        if (extractedInfo?.letterFormat?.hasNumberedList) {
          successMsg += ' Format: Numbered list style.';
        }
        
        setMessage({ type: 'success', text: successMsg });
        setUploadProgress(100);
        fetchTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Failed to upload template. Please try again.' });
    } finally {
      setLoading(false);
      setUploadProgress(100);
    }
  }, [documentType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/html': ['.html'],
      'text/plain': ['.txt'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
  });

  // Calculate salary breakup
  const calculateSalary = async () => {
    if (!employeeData.grossSalary) return;

    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/hr-documents/calculate-salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grossSalary: employeeData.grossSalary }),
      });

      const data = await response.json();
      if (data.success) {
        setSalaryBreakup(data.salaryBreakup);
      }
    } catch (error) {
      console.error('Failed to calculate salary:', error);
    }
  };

  // Preview document
  const previewDocument = async () => {
    setLoading(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/hr-documents/generate/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate || undefined,
          documentType,
          employeeData: { ...employeeData, salaryBreakup },
        }),
      });

      const html = await response.text();
      setPreviewHtml(html);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate preview' });
    } finally {
      setLoading(false);
    }
  };

  const employeeDataForPreview = useMemo(() => ({
    employee_name: employeeData.employeeName || '',
    employee_id: employeeData.employeeId || '',
    designation: employeeData.designation || '',
    department: employeeData.department || '',
    date_of_joining: employeeData.dateOfJoining || '',
    date_of_leaving: employeeData.dateOfLeaving || '',
    salary: employeeData.grossSalary ? String(employeeData.grossSalary) : '',
    address: employeeData.address || '',
    email: employeeData.email || '',
    phone: employeeData.phone || '',
    manager_name: employeeData.hrName || employeeData.signatoryName || '',
    company_name: employeeData.companyName || '',
  }), [employeeData]);

  const templateForPreview = selectedTemplateInfo || previewHtml
    ? {
        name: selectedTemplateInfo?.name || `${documentType} preview`,
        file: undefined,
        previewHtml: previewHtml,
        type: (selectedTemplateInfo?.format || 'html').toLowerCase(),
      }
    : null;

  // Generate and download document
  const generateDocument = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/hr-documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate || undefined,
          documentType,
          outputFormat,
          employeeData: { ...employeeData, salaryBreakup },
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}_${employeeData.employeeId || 'document'}.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setMessage({ type: 'success', text: 'Document generated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate document' });
    } finally {
      setLoading(false);
    }
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`${apiBase}/api/hr-documents/templates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Template deleted successfully!' });
        fetchTemplates();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete template' });
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HR Document Generator</h1>
          <p className="mt-2 text-gray-600">
            Generate professional HR documents using company templates
          </p>
        </div>

        {/* Alert Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['generate', 'templates', 'upload'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Employee Details</h2>

              <div className="space-y-4">
                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      fetchTemplateDetails(e.target.value);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Use Default Template</option>
                    {templates
                      .filter((t) => t.documentType === documentType || t.documentType === 'custom')
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                  </select>
                  {selectedTemplateInfo && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <p className="text-blue-800">
                        <strong>Template Format:</strong> {selectedTemplateInfo.format?.toUpperCase()}
                      </p>
                      {selectedTemplateInfo.structure?.letterFormat?.hasNumberedList && (
                        <p className="text-blue-600">✓ Numbered list format</p>
                      )}
                      {selectedTemplateInfo.structure?.companyInfo?.name && (
                        <p className="text-blue-600">Company: {selectedTemplateInfo.structure.companyInfo.name}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Output Format
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {OUTPUT_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                <hr className="my-4" />

                {/* Employee Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee Name *
                    </label>
                    <input
                      type="text"
                      value={employeeData.employeeName}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, employeeName: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      value={employeeData.employeeId}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, employeeId: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={employeeData.designation}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, designation: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <input
                      type="text"
                      value={employeeData.department}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, department: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Joining
                    </label>
                    <input
                      type="date"
                      value={employeeData.dateOfJoining}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, dateOfJoining: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Leaving
                    </label>
                    <input
                      type="date"
                      value={employeeData.dateOfLeaving || ''}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, dateOfLeaving: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Gross Salary (Monthly)
                    </label>
                    <div className="mt-1 flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={employeeData.grossSalary || ''}
                        onChange={(e) =>
                          setEmployeeData({
                            ...employeeData,
                            grossSalary: parseFloat(e.target.value) || 0,
                          })
                        }
                        onBlur={calculateSalary}
                        className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Additional fields for Experience/Relieving Letters */}
                  {(documentType === 'experience_letter' || documentType === 'relieving_letter') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Reason for Leaving
                        </label>
                        <select
                          value={employeeData.reasonForLeaving || 'Resigned'}
                          onChange={(e) =>
                            setEmployeeData({ ...employeeData, reasonForLeaving: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="Resigned">Resigned</option>
                          <option value="Career Growth">Career Growth</option>
                          <option value="Personal Reasons">Personal Reasons</option>
                          <option value="Relocation">Relocation</option>
                          <option value="Higher Studies">Higher Studies</option>
                          <option value="Better Opportunity">Better Opportunity</option>
                          <option value="Contract Ended">Contract Ended</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Gender
                        </label>
                        <select
                          value={employeeData.gender || 'male'}
                          onChange={(e) =>
                            setEmployeeData({ ...employeeData, gender: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={employeeData.companyName || ''}
                          onChange={(e) =>
                            setEmployeeData({ ...employeeData, companyName: e.target.value })
                          }
                          placeholder="Your Company Name"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="col-span-2 flex items-center">
                        <input
                          type="checkbox"
                          id="useNumberedFormat"
                          checked={employeeData.useNumberedFormat || false}
                          onChange={(e) =>
                            setEmployeeData({ ...employeeData, useNumberedFormat: e.target.checked })
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="useNumberedFormat" className="ml-2 block text-sm text-gray-700">
                          Use numbered list format (Service Certificate)
                        </label>
                      </div>
                    </>
                  )}
                </div>

                {/* Salary Breakup Display */}
                {salaryBreakup && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Salary Breakup</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Basic: ₹{salaryBreakup.basic?.toFixed(2)}</div>
                      <div>HRA: ₹{salaryBreakup.hra?.toFixed(2)}</div>
                      <div>DA: ₹{salaryBreakup.da?.toFixed(2)}</div>
                      <div>PF: ₹{salaryBreakup.pf?.toFixed(2)}</div>
                      <div>ESI: ₹{salaryBreakup.esi?.toFixed(2)}</div>
                      <div className="font-semibold">
                        Net Pay: ₹{salaryBreakup.netPay?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={previewDocument}
                    disabled={loading}
                    className="flex-1 py-2 px-4 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 disabled:opacity-50"
                  >
                    Preview
                  </button>
                  <button
                    onClick={generateDocument}
                    disabled={loading || !employeeData.employeeName}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate & Download'}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <DocumentPreview template={templateForPreview as any} employeeData={employeeDataForPreview as any} />
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Saved Templates</h2>
            </div>
            <div className="p-6">
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No templates uploaded yet. Go to Upload tab to add templates.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-500">
                            {DOCUMENT_TYPES.find((t) => t.value === template.documentType)?.label ||
                              template.documentType}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Format: {template.format?.toUpperCase()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setDocumentType(template.documentType);
                          setActiveTab('generate');
                        }}
                        className="mt-4 w-full py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Upload Company Template</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type for this Template
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              {...(getRootProps() as any)}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...(getInputProps() as any)} />
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-4 text-lg text-gray-600">
                {isDragActive
                  ? 'Drop the template here...'
                  : 'Drag & drop your company template here'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Supports: PDF, Word, Excel, HTML, Text, PNG, JPEG
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Browse Files
              </button>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}

            <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-800">Template Guidelines</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>Upload your company's existing HR document format</li>
                <li>The system will learn the layout, branding, and structure</li>
                <li>Use placeholders like {'{{employeeName}}'} for dynamic fields</li>
                <li>Supported formats: PDF, Word, Excel, HTML, Images</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDocumentGenerator;
