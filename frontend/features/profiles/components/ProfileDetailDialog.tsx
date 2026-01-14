import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Edit,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Download,
  Flame,
  Package,
  RefreshCw,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { EmployeeProfile } from "@/sdk/features/profiles";
import type { EmployeeAsset } from "../../exit-formalities/types";
import { PfManagementSection } from "./PfManagementSection";
import { getInitials, getBurnoutLevel } from "../utils";

interface ProfileDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EmployeeProfile | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  canEdit: boolean;
  onEdit: () => void;
  employeeAssets: EmployeeAsset[];
  loadingAssets: boolean;
  onFetchAssets: (profileId: string) => void;
  currentUser: any;
  isAdmin: boolean;
  onDeleteSuccess?: () => void;
}

/**
 * Profile Detail Dialog Component
 * Displays detailed information about a profile with multiple tabs
 */
export const ProfileDetailDialog = ({
  open,
  onOpenChange,
  profile,
  activeTab,
  onTabChange,
  canEdit,
  onEdit,
  employeeAssets,
  loadingAssets,
  onFetchAssets,
  currentUser,
  isAdmin,
  onDeleteSuccess,
}: ProfileDetailDialogProps) => {
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    if (tab === 'assets' && profile?.id && employeeAssets.length === 0) {
      onFetchAssets(profile.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-semibold">
                  {getInitials(profile.full_name || profile.email)}
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl">
                  {profile.full_name || profile.email}
                </DialogTitle>
                <p className="text-gray-500 mt-1">
                  {profile.job_title || profile.role}
                  {profile.department && ` • ${profile.department}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit && (
                <Button onClick={onEdit} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {(isAdmin || (currentUser && currentUser.id === profile.id)) && (
                <Button
                  onClick={async () => {
                    const ok = window.confirm('Are you sure you want to delete this profile? This action cannot be undone.');
                    if (!ok) return;
                    try {
                      setDeleting(true);
                      // lazy import to avoid cycle
                      const svc = await import('../services/profilesService');
                      await svc.deleteProfile(profile.id as string);
                      toast({ title: 'Deleted', description: 'Profile deleted successfully' });
                      onOpenChange(false);
                      onDeleteSuccess && onDeleteSuccess();
                    } catch (e: any) {
                      console.error('Delete profile failed', e);
                      toast({ title: 'Delete failed', description: e?.message || String(e) });
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex space-x-1 border-b mb-4 overflow-x-auto">
          {['basic', 'contact', 'skills', 'experience', 'projects', 'education', 'performance', 'burnout', 'hr-payroll', 'documents', 'assets', 'activity'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ').replace('-', ' & ')}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Basic Information */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Full Name</Label>
                <p className="text-sm font-medium">{profile.full_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">User ID (UUID)</Label>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-mono font-medium text-gray-700 flex-1 truncate">{profile.id || 'N/A'}</p>
                  {profile.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(profile.id);
                        setCopiedUuid(true);
                        setTimeout(() => setCopiedUuid(false), 2000);
                        toast({
                          title: 'Copied!',
                          description: 'User ID copied to clipboard',
                        });
                      }}
                    >
                      {copiedUuid ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Use this UUID when creating payslips</p>
              </div>
              {profile.employee_id && (
                <div>
                  <Label className="text-xs text-gray-500">Employee ID</Label>
                  <p className="text-sm font-medium">{profile.employee_id}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500">Job Title</Label>
                <p className="text-sm font-medium">{profile.job_title || profile.role || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Department</Label>
                <p className="text-sm font-medium">{profile.department || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Date of Joining</Label>
                <p className="text-sm font-medium">
                  {profile.join_date 
                    ? format(new Date(profile.join_date), "MMMM dd, yyyy")
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Employment Type</Label>
                <p className="text-sm font-medium">{profile.employment_type || 'Full-time'}</p>
              </div>
              {profile.reporting_manager && (
                <div>
                  <Label className="text-xs text-gray-500">Reporting Manager</Label>
                  <p className="text-sm font-medium">{profile.reporting_manager}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500">Total Experience</Label>
                <p className="text-sm font-medium">
                  {profile.experience_years 
                    ? `${profile.experience_years} years`
                    : 'N/A'}
                </p>
              </div>
              {profile.bio && (
                <div className="col-span-2">
                  <Label className="text-xs text-gray-500">Bio</Label>
                  <p className="text-sm text-gray-700 mt-1">{profile.bio}</p>
                </div>
              )}
            </div>
          )}

          {/* Contact Information */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Official Email</Label>
                <p className="text-sm font-medium">{profile.email}</p>
              </div>
              {profile.personal_email && (
                <div>
                  <Label className="text-xs text-gray-500">Personal Email</Label>
                  <p className="text-sm font-medium">{profile.personal_email}</p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <Label className="text-xs text-gray-500">Phone Number</Label>
                  <p className="text-sm font-medium">{profile.phone}</p>
                </div>
              )}
              {profile.emergency_contact && (
                <div>
                  <Label className="text-xs text-gray-500">Emergency Contact</Label>
                  <p className="text-sm font-medium">{profile.emergency_contact}</p>
                </div>
              )}
              {profile.linkedin_url && (
                <div>
                  <Label className="text-xs text-gray-500">LinkedIn</Label>
                  <a 
                    href={profile.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {profile.github_url && (
                <div>
                  <Label className="text-xs text-gray-500">GitHub</Label>
                  <a 
                    href={profile.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:underline flex items-center space-x-1"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Skills & Expertise */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              {profile.skills && profile.skills.length > 0 ? (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Technical Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No skills listed</p>
              )}
            </div>
          )}

          {/* Professional Experience */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Total Years of Experience</Label>
                <p className="text-lg font-semibold">{profile.experience_years || 0} years</p>
              </div>
              
              {/* Experience Timeline */}
              <div className="mt-6">
                <Label className="text-sm font-medium mb-3 block">Experience Timeline</Label>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  <div className="space-y-4">
                    {/* Current Company */}
                    {profile.join_date && (() => {
                      const joinDate = new Date(profile.join_date);
                      const now = new Date();
                      const yearsAtCompany = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                      return (
                        <div className="relative flex items-start space-x-4">
                          <div className="relative z-10 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Briefcase className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-blue-600">Current Company</p>
                                <p className="text-sm text-gray-600">{profile.department || 'Company'}</p>
                                <p className="text-sm text-gray-500">{profile.job_title || 'Employee'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {format(joinDate, "MMM yyyy")} - Present
                                </p>
                                <p className="text-xs text-gray-400">
                                  {yearsAtCompany.toFixed(1)} years
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Previous Experience */}
                    {profile.previous_projects && profile.previous_projects.length > 0 && (
                      <>
                        {Array.isArray(profile.previous_projects) && profile.previous_projects.map((project: any, idx: number) => (
                          <div key={idx} className="relative flex items-start space-x-4">
                            <div className="relative z-10 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                              <Briefcase className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">
                                    {typeof project === 'string' ? project : project.name || project.company || 'Previous Company'}
                                  </p>
                                  {typeof project === 'object' && project.role && (
                                    <p className="text-sm text-gray-600">{project.role}</p>
                                  )}
                                  {typeof project === 'object' && project.description && (
                                    <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                                  )}
                                </div>
                                {typeof project === 'object' && project.duration && (
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">{project.duration}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {(!profile.previous_projects || profile.previous_projects.length === 0) && !profile.join_date && (
                <p className="text-sm text-gray-500">No experience listed</p>
              )}
            </div>
          )}

          {/* Project History */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              {profile.project_history && profile.project_history.length > 0 ? (
                <div className="space-y-3">
                  {profile.project_history.map((project: any, idx: number) => (
                    <Card key={idx} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{project.name || 'Project'}</p>
                          {project.description && (
                            <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {project.role && (
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                Role: {project.role}
                              </span>
                            )}
                            {project.start_date && project.end_date && (
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                {format(new Date(project.start_date), "MMM yyyy")} - {format(new Date(project.end_date), "MMM yyyy")}
                              </span>
                            )}
                          </div>
                          {project.technologies && project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.technologies.map((tech: string, techIdx: number) => (
                                <span key={techIdx} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No project history available</p>
              )}
            </div>
          )}

          {/* Education */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              {profile.education && profile.education.length > 0 ? (
                <div className="space-y-3">
                  {profile.education.map((edu: any, idx: number) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-start space-x-3">
                        <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{edu.degree || edu.qualification || 'Education'}</p>
                          {edu.institution && (
                            <p className="text-sm text-gray-600 mt-1">{edu.institution}</p>
                          )}
                          {edu.graduation_year && (
                            <p className="text-xs text-gray-400 mt-1">Graduated: {edu.graduation_year}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No education information available</p>
              )}
              {profile.certifications && profile.certifications.length > 0 && (
                <div className="mt-6">
                  <Label className="text-sm font-medium mb-2 block">Certifications</Label>
                  <div className="space-y-2">
                    {profile.certifications.map((cert: any, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm">
                        <Award className="h-4 w-4 text-gray-400" />
                        <span>{cert.name || cert}</span>
                        {cert.issued_date && (
                          <span className="text-xs text-gray-400">
                            ({format(new Date(cert.issued_date), "MMM yyyy")})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Performance & Growth */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              {profile.performance_reviews && profile.performance_reviews.length > 0 ? (
                <div className="space-y-3">
                  {profile.performance_reviews.map((review: any, idx: number) => (
                    <Card key={idx} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{review.period || review.title || 'Performance Review'}</p>
                          {review.rating && (
                            <p className="text-sm text-gray-600 mt-1">Rating: {review.rating}</p>
                          )}
                          {review.summary && (
                            <p className="text-sm text-gray-600 mt-2">{review.summary}</p>
                          )}
                        </div>
                        {review.date && (
                          <span className="text-xs text-gray-400">
                            {format(new Date(review.date), "MMM yyyy")}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No performance reviews available</p>
              )}
            </div>
          )}

          {/* Burnout Risk */}
          {activeTab === 'burnout' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Flame className={`h-6 w-6 ${getBurnoutLevel(profile.burnout_score).color}`} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Burnout Risk Assessment</h3>
                      <p className="text-sm text-gray-500">Current burnout risk level</p>
                    </div>
                  </div>
                  {profile.burnout_score !== undefined && profile.burnout_score !== null ? (
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getBurnoutLevel(profile.burnout_score).color}`}>
                        {profile.burnout_score}
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full ${getBurnoutLevel(profile.burnout_score).bgColor} ${getBurnoutLevel(profile.burnout_score).color}`}>
                        {getBurnoutLevel(profile.burnout_score).level} Risk
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not Set</span>
                  )}
                </div>
                {profile.burnout_score !== undefined && profile.burnout_score !== null && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Low Risk</span>
                      <span>Critical Risk</span>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          profile.burnout_score <= 30 ? 'bg-green-500' :
                          profile.burnout_score <= 60 ? 'bg-yellow-500' :
                          profile.burnout_score <= 80 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${profile.burnout_score}%` }}
                      />
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p className="mb-2">
                        <strong>Risk Level:</strong> {getBurnoutLevel(profile.burnout_score).level}
                      </p>
                      <p className="text-xs text-gray-500">
                        {profile.burnout_score <= 30 
                          ? 'Employee shows low signs of burnout. Continue monitoring and maintain healthy work-life balance.'
                          : profile.burnout_score <= 60
                          ? 'Employee shows moderate signs of burnout. Consider workload adjustments and check-in meetings.'
                          : profile.burnout_score <= 80
                          ? 'Employee shows high signs of burnout. Immediate intervention recommended - reduce workload and provide support.'
                          : 'Employee shows critical signs of burnout. Urgent action required - consider time off and professional support.'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* HR & Payroll */}
          {activeTab === 'hr-payroll' && (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">HR & Payroll Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Employee ID</Label>
                      <p className="text-sm font-medium">{profile.employee_id || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Employment Type</Label>
                      <p className="text-sm font-medium">{profile.employment_type || 'Full-time'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Date of Joining</Label>
                      <p className="text-sm font-medium">
                        {profile.join_date 
                          ? format(new Date(profile.join_date), "MMMM dd, yyyy")
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Reporting Manager</Label>
                      <p className="text-sm font-medium">{profile.reporting_manager || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Payroll Documents</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      {currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.id === profile.id
                        ? 'Access granted to view payroll information'
                        : 'You do not have permission to view this section'}
                    </p>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.id === profile.id) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">Monthly Payslips</p>
                              <p className="text-xs text-gray-400">Available for download</p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = '/payslips'}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            View Payslips
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">Form 16</p>
                              <p className="text-xs text-gray-400">Tax document</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">PF / ESI Details</p>
                              <p className="text-xs text-gray-400">Provident fund information</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* PF Management Section */}
                  {(currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.id === profile.id) && (
                    <PfManagementSection profileId={profile.id} isAdmin={isAdmin} />
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {profile.documents && profile.documents.length > 0 ? (
                <div className="space-y-2">
                  {profile.documents.map((doc: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{doc.name || doc.type || 'Document'}</p>
                          {doc.uploaded_date && (
                            <p className="text-xs text-gray-400">
                              Uploaded: {format(new Date(doc.uploaded_date), "MMM dd, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                      {doc.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents available</p>
              )}
            </div>
          )}

          {/* Assets */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Employee Assets
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => profile?.id && onFetchAssets(profile.id)}
                    disabled={loadingAssets}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingAssets ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                {loadingAssets ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading assets...</span>
                  </div>
                ) : employeeAssets.length > 0 ? (
                  <div className="space-y-3">
                    {employeeAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-sm">{asset.asset_name}</h4>
                              {asset.asset_category && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {asset.asset_category}
                                </span>
                              )}
                            </div>
                            {asset.asset_id && (
                              <p className="text-xs text-gray-500 mb-1">
                                <span className="font-medium">Asset ID:</span> {asset.asset_id}
                              </p>
                            )}
                            {asset.assigned_date && (
                              <p className="text-xs text-gray-500 mb-1">
                                <span className="font-medium">Assigned:</span>{" "}
                                {format(new Date(asset.assigned_date), "MMMM dd, yyyy")}
                              </p>
                            )}
                            {asset.condition_at_assignment && (
                              <p className="text-xs text-gray-500 mb-1">
                                <span className="font-medium">Condition:</span> {asset.condition_at_assignment}
                              </p>
                            )}
                            {asset.notes && (
                              <p className="text-xs text-gray-600 mt-2 italic">{asset.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {asset.assigned_date && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {new Date(asset.assigned_date) < new Date() ? (
                                    <span className="text-green-600">Active</span>
                                  ) : (
                                    <span className="text-yellow-600">Pending</span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No assets assigned to this employee</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Activity Log */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
                <div className="space-y-3">
                  {profile.updated_at && (
                    <div className="flex items-start space-x-3 pb-3 border-b">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Profile Updated</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(profile.updated_at), "MMMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                  {profile.join_date && (
                    <div className="flex items-start space-x-3 pb-3 border-b">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Joined Company</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(profile.join_date), "MMMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                  {profile.created_at && (
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Profile Created</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(profile.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                  {(!profile.updated_at && !profile.join_date && !profile.created_at) && (
                    <p className="text-sm text-gray-500">No activity recorded</p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

