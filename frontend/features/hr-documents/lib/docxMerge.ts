import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { EmployeeData } from '../types';

// Field name aliases for flexible placeholder matching
const fieldAliases: Record<string, string[]> = {
  employee_name: ['employee_name', 'Employee name', 'Employee Name', 'employeename', 'name', 'employee name'],
  employee_id: ['employee_id', 'Employee ID', 'Employee id', 'employeeid', 'id', 'employee code', 'employee_code', 'Employee Code'],
  designation: ['designation', 'Designation', 'title', 'Title', 'position', 'Position'],
  department: ['department', 'Department', 'dept', 'Dept'],
  date_of_joining: ['date_of_joining', 'Date of joining', 'Date of Joining', 'dateofjoining', 'joining_date', 'join_date', 'joining date'],
  date_of_leaving: ['date_of_leaving', 'Date of leaving', 'Date of Leaving', 'Date of Ending', 'date_of_ending', 'dateofleaving', 'leaving_date', 'end_date'],
  salary: ['salary', 'Salary', 'pay', 'Pay', 'compensation', 'Compensation'],
  address: ['address', 'Address', 'addr', 'Addr'],
  email: ['email', 'Email', 'e-mail', 'E-mail', 'mail', 'Mail'],
  phone: ['phone', 'Phone', 'telephone', 'Telephone', 'mobile', 'Mobile', 'contact', 'Contact'],
  manager_name: ['manager_name', 'Manager name', 'Manager Name', 'managername', 'manager', 'Manager', 'supervisor', 'Supervisor'],
  company_name: ['company_name', 'Company name', 'Company Name', 'companyname', 'company', 'Company', 'organization', 'Organization'],
  bank_name: ['bank_name', 'Bank Name', 'bank name', 'bank'],
  bank_account: ['bank_account', 'Bank Account No', 'bank account', 'bank account no', 'bankaccount', 'account number', 'account no'],
  pan_number: ['pan_number', 'PAN Number', 'pan number', 'pan'],
  location: ['location', 'Location'],
  leave_balance: ['leave_balance', 'Leave Balance', 'leave balance'],
  effective_work_days: ['effective_work_days', 'Effective Work Days', 'effective work days'],
  lop: ['lop', 'LOP', 'lop'],
  basic_salary: ['basic_salary', 'Basic Salary', 'basic salary'],
  hra: ['hra', 'HRA', 'hra'],
  other_allowances: [
    'other_allowances',
    'Other Allowances',
    'other allowances',
    'otherallowances',
    'other Allowances',
    'Other_allowances',
    'Otherallowances',
  ],
  pt: ['pt', 'PT', 'pt'],
  total_earnings: ['total_earnings', 'Total Earnings', 'total earnings'],
  total_deduction: ['total_deduction', 'Total Deduction', 'total deduction'],
  net_pay: ['net_pay', 'Net Pay', 'net pay'],
  rupees_in_words: ['rupees_in_words', 'Rupees in Words', 'rupees in words', 'Rupees Thirty Thousand Only', 'rupees thirty thousand only'],
};

/**
 * Create a data object with all possible field name variations
 */
function createMergeData(employeeData: EmployeeData): Record<string, string> {
  const mergeData: Record<string, string> = {};
  
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    const value = employeeData[field as keyof EmployeeData] || '';
    // Add all aliases with the same value
    for (const alias of aliases) {
      mergeData[alias] = value;
    }
  }
  
  // Add custom mappings for new placeholder names
  mergeData['joiningdate'] = employeeData.date_of_joining || '';
  mergeData['other Allowances'] = employeeData.other_allowances || '';
  
  return mergeData;
}

/**
 * Merge DOCX template with employee data
 * Supports both {placeholder} and [placeholder] syntax
 */
export async function mergeDocxWithData(
  templateContent: ArrayBuffer,
  employeeData: EmployeeData
): Promise<ArrayBuffer> {
  try {
    // Load the docx file as a zip
    const zip = new PizZip(templateContent);
    
    // Create docxtemplater instance with custom delimiters support
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    });
    
    // Get the XML content to also handle [bracket] placeholders
    const xmlContent = zip.file('word/document.xml')?.asText() || '';
    
    // Check if template uses [bracket] syntax and convert to {curly}
    if (xmlContent.includes('[') && xmlContent.includes(']')) {
      // Get all XML files that might contain content
      const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml', 
                        'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'];
      
      for (const fileName of xmlFiles) {
        const file = zip.file(fileName);
        if (file) {
          let content = file.asText();
          // Convert [placeholder] to {placeholder}
          content = content.replace(/\[([^\]]+)\]/g, '{$1}');
          zip.file(fileName, content);
        }
      }
      
      // Recreate docxtemplater with modified content
      const modifiedDoc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
      });
      
      // Set the data
      modifiedDoc.setData(createMergeData(employeeData));
      
      // Render the document
      modifiedDoc.render();
      
      // Generate output
      const output = modifiedDoc.getZip().generate({
        type: 'arraybuffer',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      return output;
    }
    
    // Standard processing for {curly} syntax
    doc.setData(createMergeData(employeeData));
    doc.render();
    
    const output = doc.getZip().generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    return output;
  } catch (error: any) {
    console.error('Error merging DOCX:', error);
    
    // Create a more specific error for template issues
    if (error.properties && error.properties.errors) {
      const templateError = new Error('Invalid placeholder in template');
      (templateError as any).name = 'TemplateError';
      throw templateError;
    }
    
    throw error;
  }
}
