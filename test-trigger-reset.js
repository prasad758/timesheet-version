// HR Documents feature removed; test disabled.
console.log('test-trigger-reset skipped: HR Documents feature removed');
process.exit(0);

// Mock the templateStore and strictTemplateEngine to avoid actual database/file operations
const mockTemplateStore = {
  deleteAllTemplates: async () => ({ deletedCount: 5 }),
  getBrandingAssets: async () => null
};

const mockStrictTemplateEngine = {
  clearStoredTemplates: async () => {},
  hardReset: () => {}
};

// Test disabled; no mocks applied.

async function testTriggerTemplateReset() {
  console.log('Testing triggerTemplateReset method...');

  try {
    // Call the method
    await controller.triggerTemplateReset('default', 'payslip');

    console.log('✅ triggerTemplateReset executed successfully');
    console.log('✅ Method should have deleted all templates and cleared strict engine');

    // Verify the method exists and is callable
    if (typeof controller.triggerTemplateReset === 'function') {
      console.log('✅ triggerTemplateReset method exists and is a function');
    } else {
      console.log('❌ triggerTemplateReset method not found');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    // Restore original services
    global.templateStore = originalTemplateStore;
    global.strictTemplateEngine = originalStrictTemplateEngine;
  }
}

testTriggerTemplateReset();
