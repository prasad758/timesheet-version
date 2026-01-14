/**
 * Template Controller
 * Handles template download requests
 */

import ExcelJS from 'exceljs';

/**
 * Download employee profile template
 * GET /api/profiles/template/download
 */
export async function downloadTemplate(req, res) {
  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee_Profile');

    // Define column headers matching the template format
    const headers = [
      'Employee_ID',
      'Full_Name',
      'Official_Email',
      'Phone_Number',
      'Date_of_Joining',
      'Department',
      'Role',
      'Employment_Type',
      'Total_Experience_Years',
      'Skills',
      'Certifications',
      'Past_Projects',
      'Current_Project',
      'Manager_Name',
      'Manager_Email',
      'Location',
      'Notes'
    ];

    // Set column headers
    worksheet.columns = headers.map(header => ({
      header,
      key: header,
      width: 20
    }));

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Employee_Profile_Upload_Template.xlsx'
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[template] Download error:', error);
    res.status(500).json({
      error: 'Failed to generate template',
      message: error.message || 'Internal server error'
    });
  }
}

