/**
 * Projects Service
 * Business logic for project management
 */

import * as projectModel from '../models/projects.pg.js';
import * as gitlabService from './gitlab.service.js';

/**
 * Get all projects
 */
export async function getAllProjects() {
  const projects = await projectModel.getAllProjects();
  
  return projects.map((row, index) => ({
    id: index + 1, // Temporary ID
    name: row.name,
    description: `Project containing ${row.issue_count} issues`,
    visibility: 'private',
    issue_count: parseInt(row.issue_count),
    open_issues: parseInt(row.open_issues),
    closed_issues: parseInt(row.closed_issues),
    created_at: row.created_at
  }));
}

/**
 * Get project by ID
 */
export async function getProjectById(id) {
  const project = await projectModel.getProjectById(id);
  
  if (!project) {
    throw new Error('Project not found');
  }

  return {
    id: parseInt(id),
    name: project.name,
    description: project.description,
    visibility: 'private',
    issue_count: parseInt(project.issue_count),
    open_issues: parseInt(project.open_issues),
    closed_issues: parseInt(project.closed_issues),
    created_at: project.created_at
  };
}

/**
 * Create project
 */
export async function createProject(name, description, userId) {
  const issue = await projectModel.createProject(name, description, userId);
  
  return {
    id: issue.id,
    name: name,
    description: description,
    visibility: 'private',
    issue_count: 1,
    open_issues: 1,
    closed_issues: 0,
    created_at: issue.created_at
  };
}

/**
 * Update project
 */
export async function updateProject(id, updates) {
  const project = await projectModel.getGitLabProject(id);
  
  if (!project) {
    throw new Error('Project not found');
  }

  // Update in GitLab
  if (Object.keys(updates).length > 0) {
    try {
      await gitlabService.updateGitLabProject(project.gitlab_project_id, updates);
    } catch (gitlabError) {
      throw new Error(`Failed to update project in GitLab: ${gitlabError.response?.data?.message || gitlabError.message}`);
    }
  }

  // Update in local database
  const updatedProject = await projectModel.updateGitLabProject(id, updates);
  
  return updatedProject || project;
}

/**
 * Delete project
 */
export async function deleteProject(id) {
  const project = await projectModel.getGitLabProject(id);
  
  if (!project) {
    throw new Error('Project not found');
  }

  // Delete from GitLab (optional)
  try {
    await gitlabService.deleteGitLabProject(project.gitlab_project_id);
  } catch (gitlabError) {
    console.warn('Could not delete from GitLab:', gitlabError.response?.data?.message);
    // Continue with local deletion
  }

  // Delete from local database
  await projectModel.deleteGitLabProject(id);
  
  return { name: project.name };
}

/**
 * Get project members
 */
export async function getProjectMembers(id) {
  const project = await projectModel.getGitLabProject(id);
  
  if (!project) {
    throw new Error('Project not found');
  }

  try {
    return await gitlabService.getProjectMembers(project.gitlab_project_id);
  } catch (gitlabError) {
    throw new Error(`Failed to get project members: ${gitlabError.response?.data?.message || gitlabError.message}`);
  }
}

/**
 * Add project member
 */
export async function addProjectMember(id, userId, accessLevel) {
  const project = await projectModel.getGitLabProject(id);
  
  if (!project) {
    throw new Error('Project not found');
  }

  try {
    return await gitlabService.addProjectMember(project.gitlab_project_id, userId, accessLevel);
  } catch (gitlabError) {
    throw new Error(`Failed to add member: ${gitlabError.response?.data?.message || gitlabError.message}`);
  }
}

