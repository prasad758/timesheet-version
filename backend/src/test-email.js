/**
 * Test Resend Email Service
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const testEmail = process.argv[2] || 'naveen@techiemaya.com';

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY not found in environment variables');
  process.exit(1);
}

console.log('✅ Resend API Key found:', resendApiKey.substring(0, 10) + '...');
console.log('📧 Testing email to:', testEmail);

const resend = new Resend(resendApiKey);

async function sendTestEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'TechieMaya <noreply@pulse.techiemaya.com>',
      to: [testEmail],
      subject: '🧪 Test Email from VCP',
      html: '<h1>Test Email</h1><p>This is a test email from the VCP system.</p>',
      text: 'Test Email - This is a test email from the VCP system.'
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', data.id);
    console.log('📬 Email should arrive at:', testEmail);
    
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    console.error('Details:', err);
  }
}

sendTestEmail();
