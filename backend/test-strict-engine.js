/**
 * Test Strict Template Engine
 * 
 * Run: node test-strict-engine.js
 */

const API_BASE = 'http://localhost:3001/api/hr-documents';

async function testStrictEngine() {
  console.log('🧪 Testing Strict Template Engine...\n');

  console.log('test-strict-engine skipped: HR Documents feature removed');
  return;

  // Test 2: Test strict reset
  console.log('\n📋 Test 2: Hard reset...');
  try {
    const resetRes = await fetch(`${API_BASE}/strict/reset`, { method: 'DELETE' });
    const resetData = await resetRes.json();
    console.log('Reset result:', JSON.stringify(resetData, null, 2));
  } catch (e) {
    console.log('Reset error:', e.message);
  }

  // Test 3: Try generating without template (should fail)
  console.log('\n📋 Test 3: Generate without template (should fail)...');
  try {
    const genRes = await fetch(`${API_BASE}/strict/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          name: 'John Doe',
          designation: 'Software Engineer',
          department: 'Engineering',
          dateOfJoining: '2023-01-15'
        },
        format: 'pdf'
      })
    });
    const genData = await genRes.json();
    console.log('Generate result:', JSON.stringify(genData, null, 2));
  } catch (e) {
    console.log('Generate error (expected):', e.message);
  }

  console.log('\n✅ Strict Template Engine tests complete!');
  console.log('\n📝 To test with an actual template:');
  console.log('   1. Upload a PDF/DOCX template: POST /api/hr-documents/strict/upload');
  console.log('   2. Generate document: POST /api/hr-documents/strict/generate');
}

testStrictEngine();
