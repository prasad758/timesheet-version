/**
 * Check Resend API Status and Domain Verification
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY not found in environment variables');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

async function checkResendStatus() {
  try {
    console.log('🔍 Checking Resend API Status...\n');
    
    // Try to list domains
    console.log('📋 Checking domains...');
    try {
      const domains = await resend.domains.list();
      console.log('Domains:', JSON.stringify(domains, null, 2));
    } catch (err) {
      console.log('⚠️  Could not list domains:', err.message);
    }
    
    // Try to list recent emails
    console.log('\n📧 Checking recent emails...');
    try {
      const emails = await resend.emails.list({ limit: 5 });
      console.log('Recent emails:', JSON.stringify(emails, null, 2));
    } catch (err) {
      console.log('⚠️  Could not list emails:', err.message);
    }
    
    // Check API key
    console.log('\n🔑 API Key Status:');
    console.log('   Key prefix:', resendApiKey.substring(0, 10) + '...');
    console.log('   Environment:', process.env.NODE_ENV || 'development');
    console.log('   From address:', process.env.EMAIL_FROM || 'Not set');
    
  } catch (err) {
    console.error('❌ Error checking Resend status:', err.message);
    console.error('Details:', err);
  }
}

checkResendStatus();
