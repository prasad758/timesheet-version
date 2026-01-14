import React, { useMemo } from 'react';
import { FileText, Eye, User, Building, Mail, Phone, Calendar, MapPin, DollarSign, Briefcase, Download, RefreshCw } from 'lucide-react';

// Lightweight local types to avoid depending on missing type modules
export interface UploadedTemplate {
  id?: string;
  name?: string;
  type?: 'pdf' | 'html' | 'docx' | string;
  previewHtml?: string;
  file?: File | null;
}

export interface EmployeeData {
  employee_name?: string;
  employee_id?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  date_of_leaving?: string | null;
  salary?: string | number;
  address?: string;
  email?: string;
  phone?: string;
  manager_name?: string;
  company_name?: string;
}

interface DocumentPreviewProps {
  template: UploadedTemplate | null;
  employeeData: EmployeeData;
  onDownloadPdf?: () => void;
  onRefresh?: () => void;
}

const fieldIcons: Record<string, React.ReactNode> = {
  employee_name: <User className="h-3.5 w-3.5" />,
  employee_id: <Briefcase className="h-3.5 w-3.5" />,
  designation: <Briefcase className="h-3.5 w-3.5" />,
  department: <Building className="h-3.5 w-3.5" />,
  date_of_joining: <Calendar className="h-3.5 w-3.5" />,
  date_of_leaving: <Calendar className="h-3.5 w-3.5" />,
  salary: <DollarSign className="h-3.5 w-3.5" />,
  address: <MapPin className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  manager_name: <User className="h-3.5 w-3.5" />,
  company_name: <Building className="h-3.5 w-3.5" />,
};

const fieldLabels: Record<string, string> = {
  employee_name: "Employee Name",
  employee_id: "Employee ID",
  designation: "Designation",
  department: "Department",
  date_of_joining: "Date of Joining",
  date_of_leaving: "Date of Leaving",
  salary: "Salary",
  address: "Address",
  email: "Email",
  phone: "Phone",
  manager_name: "Manager Name",
  company_name: "Company Name",
};

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ template, employeeData, onDownloadPdf, onRefresh }) => {
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

  const mergedContent = useMemo(() => {
    if (!template?.previewHtml) return null;
    let content = template.previewHtml;

    const fieldMappings: Record<string, { value: string; label: string }> = {
      employee_name: { value: (employeeData.employee_name || '').toString(), label: fieldLabels.employee_name },
      employee_id: { value: (employeeData.employee_id || '').toString(), label: fieldLabels.employee_id },
      designation: { value: (employeeData.designation || '').toString(), label: fieldLabels.designation },
      department: { value: (employeeData.department || '').toString(), label: fieldLabels.department },
      date_of_joining: { value: (employeeData.date_of_joining || '').toString(), label: fieldLabels.date_of_joining },
      date_of_leaving: { value: (employeeData.date_of_leaving || '').toString(), label: fieldLabels.date_of_leaving },
      salary: { value: (employeeData.salary || '').toString(), label: fieldLabels.salary },
      address: { value: (employeeData.address || '').toString(), label: fieldLabels.address },
      email: { value: (employeeData.email || '').toString(), label: fieldLabels.email },
      phone: { value: (employeeData.phone || '').toString(), label: fieldLabels.phone },
      manager_name: { value: (employeeData.manager_name || '').toString(), label: fieldLabels.manager_name },
      company_name: { value: (employeeData.company_name || '').toString(), label: fieldLabels.company_name },
    };

    Object.entries(fieldMappings).forEach(([key, { value, label }]) => {
      if (!value) return;

      // Handlebars-style with optional spaces: {{ key }}
      const hb = new RegExp(`{{\\s*${escapeRegex(key)}\\s*}}`, 'gi');
      content = content.replace(hb, value);

      // Single-brace variant: {key}
      const sb = new RegExp(`{\\s*${escapeRegex(key)}\\s*}`, 'gi');
      content = content.replace(sb, value);

      // Square-bracket label variants like [Employee Name] (case-insensitive)
      if (label) {
        const bracket = new RegExp(`\\[\\s*${escapeRegex(label)}\\s*\\]`, 'gi');
        content = content.replace(bracket, value);
        const bracketLower = new RegExp(`\\[\\s*${escapeRegex(label.toLowerCase())}\\s*\\]`, 'gi');
        content = content.replace(bracketLower, value);
      }
    });

    return content;
  }, [template, employeeData]);

  const filledFields = useMemo(() => {
    return Object.entries(employeeData).filter(([_, value]) => Boolean(value) && String(value).trim() !== '');
  }, [employeeData]);

  const DataSummaryPanel: React.FC = () => (
    <div className="bg-accent/50 border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <h4 className="font-semibold text-sm text-foreground">Data to Merge</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          {filledFields.length} field{filledFields.length !== 1 ? 's' : ''} filled
        </span>
      </div>
      {filledFields.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No data entered yet. Fill in the employee form.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filledFields.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-sm bg-background rounded-md px-2.5 py-1.5">
              <span className="text-muted-foreground">{fieldIcons[key]}</span>
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground text-xs block truncate">{fieldLabels[key]}</span>
                <span className="text-foreground font-medium truncate block">{value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!template) {
    return (
      <div className="preview-container flex items-center justify-center">
        <div className="text-center p-8">
          <div className="p-4 rounded-full bg-muted inline-block mb-4">
            <Eye className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Document Preview</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Upload a template to see a live preview of the merged document
          </p>
        </div>
      </div>
    );
  }

  if (template.type === 'pdf') {
    return (
      <div className="preview-container">
        <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{template.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">PDF Preview</span>
        </div>
        <div className="p-4">
          <DataSummaryPanel />
          {template.file ? (
            <iframe
              src={URL.createObjectURL(template.file as Blob)}
              className="w-full h-[500px] rounded-lg"
              title="PDF Preview"
            />
          ) : template.previewHtml ? (
            <iframe
              srcDoc={template.previewHtml}
              className="w-full h-[500px] rounded-lg"
              title="PDF Preview"
            />
          ) : (
            <div className="h-[500px] flex items-center justify-center text-gray-400 border rounded">
              No preview available
            </div>
          )}
        </div>
      </div>
    );
  }
  const handleDownload = () => {
    const html = mergedContent || template.previewHtml || '';
    const doc = `<!doctype html><meta charset="utf-8">${html}`;
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (template.name || 'document').replace(/[^a-z0-9_.-]/gi, '_') + '.html';
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="preview-container">
      {/* Header with download buttons */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{template.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">Live Preview</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onRefresh && onRefresh()}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 flex items-center gap-1.5 font-medium shadow-sm whitespace-nowrap"
            title="Refresh Preview"
          >
            <RefreshCw className="h-4 w-4 flex-shrink-0" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onDownloadPdf && onDownloadPdf()}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 flex items-center gap-1.5 font-medium shadow-sm whitespace-nowrap"
            title="Download as PDF"
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            title="Download merged document as HTML"
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span>Download HTML</span>
          </button>
        </div>
      </div>
      {/* Scrollable document preview area */}
      <div className="bg-gray-200 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div 
          className="document-preview-content bg-white mx-auto shadow-lg rounded"
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: '12pt',
            lineHeight: '1.6',
            color: '#000',
            padding: '40px 50px',
            maxWidth: '700px',
            minHeight: '900px',
          }}
        >
          <style>{`
            .document-preview-content img { max-width: 100%; height: auto; display: block; }
            .document-preview-content h1 { font-size: 18pt; font-weight: bold; margin: 0 0 12pt 0; }
            .document-preview-content h2 { font-size: 16pt; font-weight: bold; margin: 12pt 0 8pt 0; }
            .document-preview-content h3, .document-preview-content h4 { font-size: 14pt; font-weight: bold; margin: 10pt 0 6pt 0; }
            .document-preview-content p { margin: 0 0 10pt 0; text-align: justify; }
            .document-preview-content table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
            .document-preview-content td, .document-preview-content th { border: 1px solid #000; padding: 6pt 8pt; text-align: left; vertical-align: top; }
            .document-preview-content th { background: #f5f5f5; font-weight: bold; }
            .document-preview-content ul, .document-preview-content ol { margin: 6pt 0; padding-left: 24pt; }
            .document-preview-content li { margin-bottom: 4pt; }
            .document-preview-content strong, .document-preview-content b { font-weight: bold; }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: mergedContent || '' }} />
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
