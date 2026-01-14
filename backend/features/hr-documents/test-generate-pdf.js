import axios from 'axios';
import fs from 'fs';

const testGeneratePDF = async () => {
  const url = 'http://localhost:3000/hr-documents/generate/pdf'; // Adjust the port if necessary

  const payload = {
    templateId: 'example-template.docx', // Replace with an actual template ID
    data: {
      employee_name: 'John Doe',
      document_type: 'Offer Letter',
      employee_id: '12345',
      designation: 'Software Engineer',
      department: 'Engineering',
      date_of_joining: '2023-01-01',
      salary: '100000',
      address: '123 Main St, City, Country',
      email: 'john.doe@example.com',
      phone: '123-456-7890',
      manager_name: 'Jane Smith',
      company_name: 'Tech Corp'
    }
  };

  try {
    const response = await axios.post(url, payload, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const filename = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '');
    console.log('Generated Filename:', filename);

    fs.writeFileSync(`./${filename}`, response.data);
    console.log('PDF saved locally as:', filename);
  } catch (error) {
    console.error('Error generating PDF:', error.response?.data || error.message);
  }
};

testGeneratePDF();