/**
 * Git Routes
 * API endpoints for Git/GitLab integration
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as gitController from '../controllers/git.controller.js';

const router = express.Router();

/**
 * Get all commits from GitLab
 * GET /api/git/commits
 */
router.get('/commits', authenticate, gitController.getCommits);

/**
 * Get all issues from GitLab
 * GET /api/git/issues
 */
router.get('/issues', authenticate, gitController.getIssues);

/**
 * Get commit details with diff
 * GET /api/git/commits/:sha
 */
router.get('/commits/:sha', authenticate, gitController.getCommit);

/**
 * Get issue details with comments
 * GET /api/git/issues/:id
 */
router.get('/issues/:id', authenticate, gitController.getIssue);

/**
 * Sync GitLab users with local users
 * POST /api/git/sync-users
 */
router.post('/sync-users', authenticate, gitController.syncUsers);

/**
 * Sync GitLab issues with local issues
 * POST /api/git/sync-issues
 */
router.post('/sync-issues', authenticate, gitController.syncIssues);

/**
 * Get mapped users (GitLab + local)
 * GET /api/git/users
 */
router.get('/users', authenticate, gitController.getMappedUsers);

export default router;
