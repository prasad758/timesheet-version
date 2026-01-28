import { useState, useEffect } from "react";
import { Download, FileText, Sparkles, User, ChevronDown } from "lucide-react";
import TemplateUpload from "./components/TemplateUpload";
import EmployeeDataForm from "./components/EmployeeDataForm";
import DocumentPreview from "./components/DocumentPreview";
import { Button } from "@/components/ui/button";
import { UploadedTemplate, EmployeeData, defaultEmployeeData } from "./types";
import * as joiningFormService from "../joining-form/services/joiningFormService";
import { useToast } from "@/hooks/use-toast";
import { mergeDocxWithData } from "./lib/docxMerge";
import { api } from "@/lib/api";
// @ts-ignore
import { saveAs } from "file-saver";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";
// @ts-ignore
import { renderAsync } from "docx-preview";

// Template categories for quick selection
const templateCategories = [
  { id: 'payslip', name: 'Payslip', description: 'Monthly salary slip template' },
  { id: 'offer_letter', name: 'Offer Letter', description: 'Employment offer letter' },
  { id: 'experience_letter', name: 'Experience Letter', description: 'Work experience certificate' },
  { id: 'relieving_letter', name: 'Relieving Letter', description: 'Employment relieving letter' },
  { id: 'appointment_letter', name: 'Appointment Letter', description: 'Job appointment letter' },
  { id: 'increment_letter', name: 'Increment Letter', description: 'Salary increment letter' },
  { id: 'termination_letter', name: 'Termination Letter', description: 'Employment termination letter' },
];

interface Employee {
  id: string;
  email: string;
  full_name?: string;
  employee_id?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  phone?: string;
  address?: string;
  salary?: string;
  manager_name?: string;
}

export default function HRDocumentsPage() {
  const [template, setTemplate] = useState<UploadedTemplate | null>(null);
  const [uploadedTemplates, setUploadedTemplates] = useState<UploadedTemplate[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData>(defaultEmployeeData);
  const [isDownloading, setIsDownloading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedUploadedTemplateIdx, setSelectedUploadedTemplateIdx] = useState<number | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const { toast } = useToast();

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await api.profiles.getAll() as any;
        const profilesList = response.profiles || response || [];
        setEmployees(profilesList);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // Auto-fill employee data when employee is selected
  const handleEmployeeSelect = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) {
      setEmployeeData(defaultEmployeeData);
      return;
    }
    const employee = employees.find(e => e.id === employeeId);
    try {
      // Fetch joining form for full details (including bank info)
      const joiningForm = await joiningFormService.getJoiningFormById(employeeId);
      const info = joiningForm?.employee_info || {};
      setEmployeeData({
        employee_name: info.full_name || employee?.full_name || '',
        employee_id: info.employee_id || employee?.employee_id || employee?.id?.slice(0, 8) || '',
        designation: info.designation || employee?.designation || employee?.job_title || '',
        department: info.department || employee?.department || '',
        date_of_joining: info.join_date || employee?.date_of_joining || employee?.joining_date || '',
        date_of_leaving: '',
        salary: info.salary?.toString() || '',
        address: info.current_address || employee?.address || '',
        email: info.email || employee?.email || '',
        phone: info.phone || employee?.phone || '',
        manager_name: info.manager_name || employee?.manager_name || info.reporting_manager || '',
        company_name: 'TechieMaya',
        bank_name: info.bank_name || '',
        bank_account: info.bank_account_number || '',
        pan_number: info.pan_number || '',
        location: info.location || '',
        leave_balance: info.leave_balance?.toString() || employee?.leave_balance?.toString() || '',
        effective_work_days: info.effective_work_days?.toString() || employee?.effective_work_days?.toString() || '',
        lop: info.lop?.toString() || employee?.lop?.toString() || '',
        basic_salary: info.basic_salary?.toString() || '',
        hra: info.hra?.toString() || '',
        other_allowances: info.other_allowances?.toString() || '',
        pt: info.pt?.toString() || '',
        total_earnings: info.total_earnings?.toString() || '',
        total_deduction: info.total_deduction?.toString() || '',
        net_pay: info.net_pay?.toString() || '',
        rupees_in_words: info.rupees_in_words || '',
      });
      toast({
        title: 'Employee data loaded',
        description: `Details for ${info.full_name || employee?.full_name || employee?.email} have been filled`,
      });
    } catch (error) {
      console.error('Error fetching joining form:', error);
      // Fallback to basic employee data
      setEmployeeData({
        ...defaultEmployeeData,
        employee_name: employee?.full_name || '',
        email: employee?.email || '',
        employee_id: employee?.employee_id || employee?.id?.slice(0, 8) || '',
      });
    }
  };

  const makeSafeFileName = (name: string) => {
    const cleaned = name
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\.+$/g, "");

    return cleaned.length > 0 ? cleaned : "document";
  };

  const getEmployeeFileBaseName = () => {
    const raw = employeeData.employee_name?.trim();
    return makeSafeFileName(raw || "employee_document");
  };

  const validateBeforeDownload = (): boolean => {
    if (!template) {
      toast({
        title: "No template loaded",
        description: "Please upload a document template first.",
        variant: "destructive",
      });
      return false;
    }

    const filledFields = Object.entries(employeeData).filter(([_, v]) => v.trim() !== "");
    if (filledFields.length === 0) {
      toast({
        title: "No data entered",
        description: "Please fill in at least one employee field.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleDownloadDocx = async () => {
    if (!validateBeforeDownload() || !template) return;

    try {
      setIsDownloading(true);
      const mergedContent = await mergeDocxWithData(template.content, employeeData);
      const blob = new Blob([mergedContent], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(blob, `${getEmployeeFileBaseName()}.docx`);

      toast({
        title: "Document downloaded",
        description: "Your merged DOCX document has been saved.",
      });
    } catch (error) {
      console.error("Download error:", error);
      const message =
        error && typeof error === "object" && "name" in error && (error as any).name === "TemplateError"
          ? "Your template has an invalid placeholder (example: use {employee_name} or [employee_name])."
          : "There was an error generating the document.";
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!validateBeforeDownload() || !template) return;

    let tempContainer: HTMLDivElement | null = null;
    let styleEl: HTMLStyleElement | null = null;

    try {
      setIsDownloading(true);

      const baseName = getEmployeeFileBaseName();

      if (template.type === "pdf") {
        saveAs(template.file, `${baseName}.pdf`);
        toast({
          title: "PDF downloaded",
          description: "Your PDF document has been saved.",
        });
        return;
      }

      const mergedContent = await mergeDocxWithData(template.content, employeeData);

      tempContainer = document.createElement("div");
      tempContainer.id = "docx-pdf-render";
      tempContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 794px;
        background: white;
        z-index: -9999;
        overflow: visible;
      `;
      document.body.appendChild(tempContainer);

      styleEl = document.createElement("style");
      styleEl.id = "docx-pdf-styles";
      styleEl.textContent = `
        #docx-pdf-render {
          background: white !important;
          font-family: 'Times New Roman', Times, serif !important;
        }
        #docx-pdf-render .docx-wrapper {
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #docx-pdf-render section.docx {
          margin: 0 !important;
          padding: 40px 50px !important;
          box-shadow: none !important;
          background: white !important;
          min-height: 1123px !important;
          height: 1123px !important;
          width: 794px !important;
          overflow: hidden !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
        }
        #docx-pdf-render article.docx-header {
          display: block !important;
          visibility: visible !important;
          position: relative !important;
          width: 100% !important;
          min-height: 60px !important;
          padding-bottom: 10px !important;
          border-bottom: none !important;
          flex-shrink: 0 !important;
        }
        #docx-pdf-render article.docx-footer {
          display: block !important;
          visibility: visible !important;
          position: absolute !important;
          bottom: 40px !important;
          left: 50px !important;
          right: 50px !important;
          width: auto !important;
          min-height: 40px !important;
          padding-top: 10px !important;
        }
        #docx-pdf-render .docx-body {
          flex: 1 !important;
          overflow: hidden !important;
        }
        #docx-pdf-render img {
          max-width: 100% !important;
          height: auto !important;
          display: inline-block !important;
          visibility: visible !important;
        }
        #docx-pdf-render table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        #docx-pdf-render * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #docx-pdf-render p, #docx-pdf-render span {
          visibility: visible !important;
        }
      `;
      document.head.appendChild(styleEl);

      await renderAsync(mergedContent, tempContainer, undefined, {
        className: "docx",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: true,
        trimXmlDeclaration: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      const images = tempContainer.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                })
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 800));

      const sections = tempContainer.querySelectorAll("section.docx");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;

      const captureSection = async (sectionEl: HTMLElement, pageIndex: number) => {
        const canvas = await html2canvas(sectionEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 20000,
          width: 794,
          height: 1123,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll("img").forEach((img) => {
              (img as HTMLImageElement).crossOrigin = "anonymous";
              (img as HTMLElement).style.visibility = "visible";
            });

            const clonedSection = clonedDoc.querySelector(`section.docx:nth-of-type(${pageIndex + 1})`);
            if (clonedSection) {
              clonedSection.querySelectorAll("*").forEach((el) => {
                (el as HTMLElement).style.visibility = "visible";
              });
            }
          },
        });

        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL("image/png", 1.0);
        } catch (e) {
          throw new Error(
            "Cannot render the PDF because an image/logo blocks canvas export (CORS). If your template uses external logos, embed them into the DOCX file."
          );
        }

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      };

      if (sections.length > 0) {
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement;
          section.style.display = "block";
          section.style.visibility = "visible";
          await captureSection(section, i);
        }
      } else {
        const wrapper = (tempContainer.querySelector(".docx-wrapper") || tempContainer) as HTMLElement;
        await captureSection(wrapper, 0);
      }

      const pdfBlob = pdf.output("blob");
      saveAs(pdfBlob, `${baseName}.pdf`);

      toast({
        title: "PDF downloaded",
        description: "Your merged PDF document has been saved.",
      });
    } catch (error) {
      console.error("PDF download error:", error);
      const message =
        error && typeof error === "object" && "name" in error && (error as any).name === "TemplateError"
          ? "Your template has an invalid placeholder (example: use {employee_name} or [employee_name])."
          : error instanceof Error
            ? error.message
            : "There was an error generating the PDF. Try downloading DOCX instead.";
      toast({
        title: "PDF download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      try {
        if (tempContainer?.parentNode) document.body.removeChild(tempContainer);
        if (styleEl?.parentNode) document.head.removeChild(styleEl);
      } catch {
        // ignore cleanup errors
      }
      setIsDownloading(false);
    }
  };

  const handleClearForm = () => {
    setEmployeeData(defaultEmployeeData);
    toast({
      title: "Form cleared",
      description: "All employee data has been reset.",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">HR Document Generator</h1>
        <p className="text-muted-foreground">Upload templates and merge employee data to generate documents</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Upload & Form */}
        <div className="space-y-6">
          {/* Template Category Selector */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">1. Select Template Type</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {templateCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={async () => {
                    setSelectedCategory(cat.id);
                    setSelectedUploadedTemplateIdx(null);
                    // Try to fetch a default template for this category (if available)
                    // For now, clear uploaded template and setTemplate(null)
                    setTemplate(null);
                    // Optionally, fetch a default template from server or static assets here
                    // Example: await fetchDefaultTemplate(cat.id)
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedCategory === cat.id && selectedUploadedTemplateIdx === null
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</p>
                </button>
              ))}
            </div>

            {/* Uploaded Templates List */}
            {uploadedTemplates.length > 0 && (
              <>
                <div className="mt-2 mb-2 text-xs font-semibold text-foreground">Uploaded Templates</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {uploadedTemplates.map((ut, idx) => (
                    <button
                      key={ut.name + idx}
                      onClick={() => {
                        setSelectedUploadedTemplateIdx(idx);
                        setSelectedCategory('');
                        setTemplate(ut);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all flex flex-col ${
                        selectedUploadedTemplateIdx === idx
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <span className="font-medium text-sm truncate">{ut.name}</span>
                      <span className="text-xs text-muted-foreground uppercase mt-1">{ut.type} template</span>
                      <button
                        className="text-xs text-red-500 mt-2 underline self-start"
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setUploadedTemplates(prev => prev.filter((_, i) => i !== idx));
                          if (selectedUploadedTemplateIdx === idx) {
                            setSelectedUploadedTemplateIdx(null);
                            setTemplate(null);
                          }
                        }}
                      >Remove</button>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="text-sm text-muted-foreground mb-3">
              {selectedCategory
                ? <span className="text-primary">Selected: {templateCategories.find(c => c.id === selectedCategory)?.name}</span>
                : selectedUploadedTemplateIdx !== null && uploadedTemplates[selectedUploadedTemplateIdx]
                  ? <span className="text-primary">Selected: {uploadedTemplates[selectedUploadedTemplateIdx].name}</span>
                  : 'Or upload your own template below:'}
            </div>

            <TemplateUpload
              onTemplateUpload={tpl => {
                setUploadedTemplates(prev => [...prev, tpl]);
                setSelectedUploadedTemplateIdx(uploadedTemplates.length); // select the new one
                setSelectedCategory('');
                setTemplate(tpl);
              }}
              currentTemplate={template}
              onRemoveTemplate={() => {
                if (selectedUploadedTemplateIdx !== null) {
                  setUploadedTemplates(prev => prev.filter((_, i) => i !== selectedUploadedTemplateIdx));
                  setSelectedUploadedTemplateIdx(null);
                  setTemplate(null);
                } else {
                  setTemplate(null);
                }
              }}
            />
          </section>

          {/* Employee Selector */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">2. Select Employee</h2>
              <button
                onClick={handleClearForm}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
            
            {/* Employee Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                <User className="h-4 w-4 inline-block mr-2" />
                Choose Employee
              </label>
              <div className="relative">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full h-10 px-3 pr-10 border border-border rounded-md bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={loadingEmployees}
                >
                  <option value="">
                    {loadingEmployees ? 'Loading employees...' : '-- Select an employee to auto-fill --'}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email} {emp.employee_id ? `(${emp.employee_id})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              {selectedEmployeeId && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ Employee data loaded. You can still edit fields below.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-4">Or enter details manually:</p>
              <EmployeeDataForm data={employeeData} onChange={setEmployeeData} />
            </div>
          </section>

          <div className="flex gap-3">
            <Button
              onClick={handleDownloadDocx}
              className="flex-1 h-12 font-medium"
              disabled={!template || isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download DOCX
            </Button>
            <Button
              onClick={handleDownloadPdf}
              variant="outline"
              className="flex-1 h-12 font-medium"
              disabled={!template || isDownloading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>

          <div className="bg-accent/30 rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-primary/10 mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm text-foreground mb-1">Supported Placeholders</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Use these formats in your template: <code className="bg-background px-1 rounded">{'{field}'}</code> or <code className="bg-background px-1 rounded">[field]</code>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "employee_name", alt: "Employee name" },
                    { key: "employee_id", alt: "Employee ID" },
                    { key: "designation", alt: "Designation" },
                    { key: "department", alt: "Department" },
                    { key: "date_of_joining", alt: "Date of joining" },
                    { key: "date_of_leaving", alt: "Date of Ending" },
                    { key: "salary", alt: "Salary" },
                    { key: "email", alt: "Email" },
                    { key: "phone", alt: "Phone" },
                    { key: "address", alt: "Address" },
                    { key: "manager_name", alt: "Manager Name" },
                    { key: "company_name", alt: "Company Name" },
                  ].map(({ key, alt }) => (
                    <code
                      key={key}
                      className="text-xs bg-background px-2 py-0.5 rounded border border-border text-muted-foreground"
                      title={`Also accepts: [${alt}]`}
                    >
                      {`{${key}}`}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Tip: Also works with [Employee name], [Date of Ending], etc.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">3. Preview</h2>
          </div>
          <DocumentPreview 
            template={template} 
            employeeData={employeeData} 
            onDownloadPdf={handleDownloadPdf} 
            onDownloadDocx={handleDownloadDocx} 
          />
        </div>
      </div>
    </div>
  );
}
