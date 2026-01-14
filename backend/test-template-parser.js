/**
 * Test Template Parser
 *
 * Run: node test-template-parser.js
 */

import templateParser from './features/hr-documents/services/template-parser.js';
import fs from 'fs/promises';
import path from 'path';

async function testTemplateParser() {
  console.log('🧪 Testing Template Parser...\n');

  // Test with a sample template file (you'll need to provide the path to your uploaded template)
  const testTemplatePath = process.argv[2] || './test-template.pdf'; // Pass template path as argument

  try {
    console.log('📋 Testing template parsing...');
    console.log('Template path:', testTemplatePath);

    // Check if file exists
    try {
      await fs.access(testTemplatePath);
      console.log('✅ Template file exists');
    } catch (e) {
      console.log('❌ Template file not found. Please provide a valid template file path');
      console.log('Usage: node test-template-parser.js <template-file-path>');
      return;
    }

    const parsedTemplate = await templateParser.parseTemplate(testTemplatePath);

    console.log('\n📋 Parsed Template Results:');
    console.log('Format:', parsedTemplate.format);
    console.log('Content length:', parsedTemplate.content?.length || 0);
    console.log('Has content:', !!parsedTemplate.content);

    console.log('\n📋 Structure Analysis:');
    console.log('Document Type:', parsedTemplate.structure?.documentType);
    console.log('Letter Format:', JSON.stringify(parsedTemplate.structure?.letterFormat, null, 2));

    console.log('\n📋 Company Info Extraction:');
    console.log('Company Name:', parsedTemplate.structure?.companyInfo?.name || 'NOT FOUND');
    console.log('Company Address:', parsedTemplate.structure?.companyInfo?.address || 'NOT FOUND');
    console.log('Company Phone:', parsedTemplate.structure?.companyInfo?.phone || 'NOT FOUND');
    console.log('Company Email:', parsedTemplate.structure?.companyInfo?.email || 'NOT FOUND');

    console.log('\n📋 Employee Fields Found:');
    console.log('Fields:', parsedTemplate.structure?.employeeFields?.map(f => `${f.name}: ${f.value}`).join(', ') || 'NONE');

    console.log('\n📋 Signature Block:');
    console.log('Signatory Name:', parsedTemplate.structure?.signatureBlock?.signatoryName || 'NOT FOUND');
    console.log('Signatory Title:', parsedTemplate.structure?.signatureBlock?.signatoryTitle || 'NOT FOUND');

    console.log('\n📋 Raw Content Preview (first 500 chars):');
    console.log('---');
    console.log((parsedTemplate.content || '').substring(0, 500));
    console.log('---');

    console.log('\n📋 Dynamic Fields Detected:');
    console.log('Fields:', parsedTemplate.fields?.map(f => f.name).join(', ') || 'NONE');

    // Test if this would be considered "learned content"
    const hasLearnedContent = parsedTemplate.content ||
                              parsedTemplate.structure?.rawContent ||
                              parsedTemplate.layout?.sections?.length > 0;

    console.log('\n📋 Generation Mode:');
    console.log('Has Learned Content:', hasLearnedContent);
    console.log('Will use learned template generation:', hasLearnedContent);

  } catch (error) {
    console.error('❌ Template parsing error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTemplateParser();
