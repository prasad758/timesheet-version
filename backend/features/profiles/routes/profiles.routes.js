/**
 * Profiles Routes
 * Define API endpoints only
 * Wire middleware and controllers
 * NO business logic
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as profilesController from '../controllers/profiles.controller.js';
import * as extractionController from '../controllers/profile-extraction.controller.js';
import * as templateController from '../controllers/template.controller.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware.js';

const router = express.Router();

// Diagnostic middleware: log when requests reach the profiles router
router.use((req, res, next) => {
  console.log(`[profiles.router] Entered router: ${req.method} ${req.path}`);
  next();
});

// All routes require authentication EXCEPT profile extraction routes
router.use((req, res, next) => {
  // Skip authentication for profile extraction routes
  if (req.path.startsWith('/extract') || req.path.startsWith('/template') || req.path === '/save-edited') {
    return next();
  }
  authenticate(req, res, next);
});

/**
 * GET /api/profiles
 * Get all employee profiles
 */
router.get('/', profilesController.getAllProfiles);

/**
 * GET /api/profiles/template/download
 * Download employee profile upload template
 * NOTE: Must be before /:id route to avoid route conflict
 */
router.get('/template/download', templateController.downloadTemplate);

/**
 * POST /api/profiles/extract
 * Extract profile from uploaded file (single file)
 */
router.post('/extract', uploadSingle, extractionController.extractProfile);

/**
 * POST /api/profiles/extract/batch
 * Extract profiles from multiple uploaded files
 */
router.post('/extract/batch', uploadMultiple, extractionController.extractProfilesBatch);

/**
 * POST /api/profiles/save-edited
 * Save edited profile data
 */
router.post('/save-edited', extractionController.saveEditedProfile);

/**
 * POST /api/profiles/upload-batch
 * Upload and save multiple profiles from Excel/CSV file
 */
router.post('/upload-batch', uploadSingle, extractionController.uploadBatchProfiles);

/**
 * GET /api/profiles/:id
 * Get single employee profile
 * NOTE: Must be after specific routes to avoid conflicts
 */
router.get('/:id', profilesController.getProfileById);

/**
 * PUT /api/profiles/:id
 * Update employee profile
 */
router.put('/:id', profilesController.updateProfile);

/**
 * DELETE /api/profiles/:id
 * Delete employee profile (owner or admin)
 */
router.delete('/:id', profilesController.deleteProfile);

export default router;

