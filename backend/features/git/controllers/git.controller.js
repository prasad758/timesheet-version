/**
 * Git Controller
 * Handles HTTP requests for Git/GitLab integration
 */

import * as gitService from '../services/git.service.js';

/**
 * Get all commits
 * GET /api/git/commits
 */
export async function getCommits(req, res) {
  try {
    const commits = await gitService.getCommits();
    res.json(commits);
  } catch (error) {
    console.error('Error fetching commits:', error.message);
    res.json([]);
  }
}

/**
 * Get all issues
 * GET /api/git/issues
 */
export async function getIssues(req, res) {
  try {
    const issues = await gitService.getIssues();
    res.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    res.json([]);
  }
}

/**
 * Get commit details
 * GET /api/git/commits/:sha
 */
export async function getCommit(req, res) {
  try {
    const { sha } = req.params;
    const commit = await gitService.getCommit(sha);
    res.json(commit);
  } catch (error) {
    console.error('Error fetching commit details:', error.message);
    res.status(404).json({ error: 'Commit not found' });
  }
}

/**
 * Get issue details
 * GET /api/git/issues/:id
 */
export async function getIssue(req, res) {
  try {
    const { id } = req.params;
    const issue = await gitService.getIssue(id);
    res.json(issue);
  } catch (error) {
    console.error('Error fetching issue details:', error.message);
    res.status(404).json({ error: 'Issue not found' });
  }
}

/**
 * Sync GitLab users
 * POST /api/git/sync-users
 */
export async function syncUsers(req, res) {
  try {
    const result = await gitService.syncUsers();
    res.json({ 
      message: `Synced ${result.synced} new users from GitLab`,
      total: result.total,
      synced: result.synced
    });
  } catch (error) {
    console.error('Error syncing GitLab users:', error.message);
    res.status(500).json({ error: 'Failed to sync GitLab users' });
  }
}

/**
 * Sync GitLab issues
 * POST /api/git/sync-issues
 */
export async function syncIssues(req, res) {
  try {
    const result = await gitService.syncIssues();
    res.json({ 
      message: `Synced ${result.synced} new issues from GitLab`,
      total: result.total,
      synced: result.synced
    });
  } catch (error) {
    console.error('Error syncing GitLab issues:', error.message);
    res.status(500).json({ error: 'Failed to sync GitLab issues' });
  }
}

/**
 * Get mapped users
 * GET /api/git/users
 */
export async function getMappedUsers(req, res) {
  try {
    const users = await gitService.getMappedUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching mapped users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

