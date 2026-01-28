import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  User, Briefcase, GraduationCap, Users, Heart,
  Plus, Trash2, Save, ArrowLeft, CheckCircle, ShieldCheck, FileText
} from "lucide-react";
import * as joiningFormService from "../joining-form/services/joiningFormService";
import type {
  EmployeeInfo,
  FamilyMember,
  AcademicInfo,
  PreviousEmployment,
  VerificationInfo,
  EmployerVerification
} from "../joining-form/types";

const emptyEmployeeInfo: EmployeeInfo = {
  full_name: "",
  email: "",
  employee_id: "",
  date_of_birth: "",
  gender: "",
  join_date: "",
  designation: "",
  department: "",
  phone: "",
  personal_email: "",
  marital_status: "",
  uan_number: "",
  pf_number: "",
  current_address: "",
  permanent_address: "",
  languages_known: [],
  bank_name: "",
  bank_ifsc: "",
  bank_branch: "",
  bank_account_number: "",
  blood_group: "",
  height: "",
  weight: "",
  medical_history: ""
};

const emptyFamilyMember: FamilyMember = {
  member_type: "",
  member_name: "",
  contact: "",
  location: "",
  relation: ""
};

const emptyAcademicInfo: AcademicInfo = {
  qualification: "",
  specialization: "",
  institution_name: "",
  board_university: "",
  passout_year: new Date().getFullYear(),
  grade_percentage: ""
};

const emptyPreviousEmployment: PreviousEmployment = {
  employer_name: "",
  designation: "",
  duration_from: "",
  duration_to: "",
  salary: "",
  reason_for_leaving: ""
};

const emptyVerificationEmployer: EmployerVerification = {
  employer_name: "",
  designation: "",
  location: "",
  period_of_working: "",
  reason_for_leaving: "",
  supervisor_contact: "",
  hr_mail: "",
  hr_contact: ""
};

const emptyVerificationInfo: VerificationInfo = {
  name: "",
  father_name: "",
  designation: "",
  department: "",
  date_of_birth: "",
  pan_number: "",
  aadhar_number: "",
  gender: "",
  present_address: "",
  present_stay_period: "",
  present_contact: "",
  permanent_address: "",
  permanent_stay_period: "",
  permanent_contact: "",
  employers: [
    { ...emptyVerificationEmployer },
    { ...emptyVerificationEmployer },
    { ...emptyVerificationEmployer },
    { ...emptyVerificationEmployer }
  ]
};

// The main reusable joining form component
import { useNavigate } from "react-router-dom";

export default function JoiningForm({
  profileId,
  onComplete,
  onCancel,
  isModal
}: {
  profileId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("employee");

  // Form state
  const [profileIdState, setProfileId] = useState<string | undefined>(profileId);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>(emptyEmployeeInfo);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [academicInfo, setAcademicInfo] = useState<AcademicInfo[]>([]);
  const [previousEmployment, setPreviousEmployment] = useState<PreviousEmployment[]>([]);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo>(emptyVerificationInfo);
  // KYC upload handler
  const handleKycUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ...existing logic for handling KYC uploads...
  };

  // Load existing form data if editing
  useEffect(() => {
    if (profileIdState) {
      loadFormData(profileIdState);
    }
  }, [profileIdState]);

  const loadFormData = async (id: string) => {
    setLoading(true);
    try {
      const form = await joiningFormService.getJoiningFormById(id);
      if (form) {
        setEmployeeInfo(form.employee_info || emptyEmployeeInfo);
        setFamilyMembers(form.family_members || []);
        setAcademicInfo(form.academic_info || []);
        setPreviousEmployment(form.previous_employment || []);
        setVerificationInfo(form.verification_info || emptyVerificationInfo);
      }
    } catch (error) {
      console.error("Failed to load form data:", error);
      toast({ title: "Error", description: "Failed to load form data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let id = profileIdState;
      if (!id) {
        // Create new joining form
        const res = await joiningFormService.createJoiningForm({
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "in_progress"
        });
        id = res.id;
        setProfileId(id);
      } else {
        // Update existing
        await joiningFormService.saveJoiningForm(id, {
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "in_progress"
        });
      }
      toast({ title: "Success", description: "Form saved successfully" });
    } catch (error) {
      console.error("Failed to save form:", error);
      toast({ title: "Error", description: "Failed to save form", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      let id = profileIdState;
      if (!id) {
        // Create new joining form with completed status
        const res = await joiningFormService.createJoiningForm({
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "completed"
        });
        id = res.id;
        setProfileId(id);
      } else {
        // Update and complete
        await joiningFormService.saveJoiningForm(id, {
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "completed"
        });
        await joiningFormService.completeOnboarding(id);
      }
      toast({ title: "Success", description: "Onboarding completed successfully" });
      if (onComplete) onComplete();
      else if (!isModal) navigate("/joining-form");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast({ title: "Error", description: "Failed to complete onboarding", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Family member handlers
  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { ...emptyFamilyMember }]);
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  // Academic info handlers
  const addAcademicInfo = () => {
    setAcademicInfo([...academicInfo, { ...emptyAcademicInfo }]);
  };

  const updateAcademicInfo = (index: number, field: keyof AcademicInfo, value: string | number) => {
    const updated = [...academicInfo];
    updated[index] = { ...updated[index], [field]: value };
    setAcademicInfo(updated);
  };

  const removeAcademicInfo = (index: number) => {
    setAcademicInfo(academicInfo.filter((_, i) => i !== index));
  };

  // Previous employment handlers
  const addPreviousEmployment = () => {
    setPreviousEmployment([...previousEmployment, { ...emptyPreviousEmployment }]);
  };

  const updatePreviousEmployment = (index: number, field: keyof PreviousEmployment, value: string) => {
    const updated = [...previousEmployment];
    updated[index] = { ...updated[index], [field]: value };
    setPreviousEmployment(updated);
  };

  const removePreviousEmployment = (index: number) => {
    setPreviousEmployment(previousEmployment.filter((_, i) => i !== index));
  };

  // Verification handlers
  const updateVerificationField = (field: keyof VerificationInfo, value: string) => {
    setVerificationInfo({ ...verificationInfo, [field]: value });
  };

  const updateVerificationEmployer = (
    index: number,
    field: keyof EmployerVerification,
    value: string
  ) => {
    const employers = [...verificationInfo.employers];
    employers[index] = { ...employers[index], [field]: value };
    setVerificationInfo({ ...verificationInfo, employers });
  };

  // ...existing code...

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 bg-gray-50">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {!isModal && (
                <Button variant="ghost" size="icon" onClick={() => navigate("/joining-form")}> 
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">New Joining Form</h1>
                <p className="text-gray-500">Complete employee onboarding information</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={handleComplete} disabled={saving}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Onboarding
              </Button>
              {isModal && onCancel && (
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab("employee")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === "employee"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <User className="h-4 w-4" />
              <span>Basic Info</span>
            </button>
            <button
              onClick={() => setActiveTab("family")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === "family"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Family</span>
            </button>
            <button
              onClick={() => setActiveTab("academic")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === "academic"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Education</span>
            </button>
            <button
              onClick={() => setActiveTab("employment")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === "employment"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Experience</span>
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === "health"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Heart className="h-4 w-4" />
              <span>Health</span>
            </button>
            <button
              onClick={() => setActiveTab("verification")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === "verification"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Verification</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="hidden">
            <TabsTrigger value="employee" className="hidden">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Employee Info</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="hidden">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Family</span>
            </TabsTrigger>
            <TabsTrigger value="academic" className="hidden">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Academic</span>
            </TabsTrigger>
            <TabsTrigger value="employment" className="hidden">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Experience</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="hidden">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="hidden">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Verification</span>
            </TabsTrigger>
          </TabsList>


        {/* Employee Information Tab */}
        <TabsContent value="employee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* ...existing basic info fields... */}
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" value={employeeInfo.full_name} onChange={e => setEmployeeInfo({ ...employeeInfo, full_name: e.target.value })} placeholder="Enter full name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={employeeInfo.email} onChange={e => setEmployeeInfo({ ...employeeInfo, email: e.target.value })} placeholder="Enter email address" />
                </div>
                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input id="employee_id" value={employeeInfo.employee_id} onChange={e => setEmployeeInfo({ ...employeeInfo, employee_id: e.target.value })} placeholder="Enter employee ID" />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" value={employeeInfo.date_of_birth} onChange={e => setEmployeeInfo({ ...employeeInfo, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={employeeInfo.gender} onValueChange={value => setEmployeeInfo({ ...employeeInfo, gender: value })}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="join_date">Join Date</Label>
                  <Input id="join_date" type="date" value={employeeInfo.join_date} onChange={e => setEmployeeInfo({ ...employeeInfo, join_date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" value={employeeInfo.designation} onChange={e => setEmployeeInfo({ ...employeeInfo, designation: e.target.value })} placeholder="Enter designation" />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={employeeInfo.department} onChange={e => setEmployeeInfo({ ...employeeInfo, department: e.target.value })} placeholder="Enter department" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={employeeInfo.phone} onChange={e => setEmployeeInfo({ ...employeeInfo, phone: e.target.value })} placeholder="Enter phone number" />
                </div>
                <div>
                  <Label htmlFor="personal_email">Personal Email</Label>
                  <Input id="personal_email" type="email" value={employeeInfo.personal_email} onChange={e => setEmployeeInfo({ ...employeeInfo, personal_email: e.target.value })} placeholder="Enter personal email" />
                </div>
                <div>
                  <Label htmlFor="marital_status">Marital Status</Label>
                  <Select value={employeeInfo.marital_status} onValueChange={value => setEmployeeInfo({ ...employeeInfo, marital_status: value })}>
                    <SelectTrigger id="marital_status">
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Employee Code */}
                <div>
                  <Label htmlFor="employee_id">Employee Code</Label>
                  <Input id="employee_id" value={employeeInfo.employee_id} onChange={e => setEmployeeInfo({ ...employeeInfo, employee_id: e.target.value })} placeholder="Enter employee code" />
                </div>
                {/* UAN */}
                <div>
                  <Label htmlFor="uan_number">UAN</Label>
                  <Input id="uan_number" value={employeeInfo.uan_number} onChange={e => setEmployeeInfo({ ...employeeInfo, uan_number: e.target.value })} placeholder="Enter UAN number" />
                </div>
                {/* PF No */}
                <div>
                  <Label htmlFor="pf_number">PF No</Label>
                  <Input id="pf_number" value={employeeInfo.pf_number} onChange={e => setEmployeeInfo({ ...employeeInfo, pf_number: e.target.value })} placeholder="Enter PF number" />
                </div>
                {/* Current Address */}
                <div>
                  <Label htmlFor="current_address">Current Address</Label>
                  <Input id="current_address" value={employeeInfo.current_address} onChange={e => setEmployeeInfo({ ...employeeInfo, current_address: e.target.value })} placeholder="Enter current address" />
                </div>
                {/* Permanent Address */}
                <div>
                  <Label htmlFor="permanent_address">Permanent Address</Label>
                  <Input id="permanent_address" value={employeeInfo.permanent_address} onChange={e => setEmployeeInfo({ ...employeeInfo, permanent_address: e.target.value })} placeholder="Enter permanent address" />
                </div>
                {/* Language Known */}
                <div>
                  <Label htmlFor="languages_known">Language Known</Label>
                  <Input id="languages_known" value={employeeInfo.languages_known.join(', ')} onChange={e => setEmployeeInfo({ ...employeeInfo, languages_known: e.target.value.split(',').map(l => l.trim()) })} placeholder="Enter languages, comma separated" />
                </div>
                {/* Bank Details */}
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input id="bank_name" value={employeeInfo.bank_name} onChange={e => setEmployeeInfo({ ...employeeInfo, bank_name: e.target.value })} placeholder="Enter bank name" />
                </div>
                <div>
                  <Label htmlFor="bank_ifsc">Bank IFSC</Label>
                  <Input id="bank_ifsc" value={employeeInfo.bank_ifsc} onChange={e => setEmployeeInfo({ ...employeeInfo, bank_ifsc: e.target.value })} placeholder="Enter IFSC code" />
                </div>
                <div>
                  <Label htmlFor="bank_branch">Bank Branch</Label>
                  <Input id="bank_branch" value={employeeInfo.bank_branch} onChange={e => setEmployeeInfo({ ...employeeInfo, bank_branch: e.target.value })} placeholder="Enter branch" />
                </div>
                <div>
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input id="bank_account_number" value={employeeInfo.bank_account_number} onChange={e => setEmployeeInfo({ ...employeeInfo, bank_account_number: e.target.value })} placeholder="Enter account number" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="academic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              {academicInfo.map((info, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 border-b pb-4">
                  <div>
                    <Label>Qualification</Label>
                    <Input value={info.qualification} onChange={e => updateAcademicInfo(idx, "qualification", e.target.value)} placeholder="e.g. B.Tech, M.Sc" />
                  </div>
                  <div>
                    <Label>Specialization</Label>
                    <Input value={info.specialization} onChange={e => updateAcademicInfo(idx, "specialization", e.target.value)} placeholder="e.g. Computer Science" />
                  </div>
                  <div>
                    <Label>Institution Name</Label>
                    <Input value={info.institution_name} onChange={e => updateAcademicInfo(idx, "institution_name", e.target.value)} placeholder="Enter institution name" />
                  </div>
                  <div>
                    <Label>Board/University</Label>
                    <Input value={info.board_university} onChange={e => updateAcademicInfo(idx, "board_university", e.target.value)} placeholder="Enter board/university" />
                  </div>
                  <div>
                    <Label>Passout Year</Label>
                    <Input type="number" value={info.passout_year} onChange={e => updateAcademicInfo(idx, "passout_year", Number(e.target.value))} placeholder="Year" />
                  </div>
                  <div>
                    <Label>Grade/Percentage</Label>
                    <Input value={info.grade_percentage} onChange={e => updateAcademicInfo(idx, "grade_percentage", e.target.value)} placeholder="e.g. 8.5 CGPA, 75%" />
                  </div>
                  <div className="flex items-end">
                    <Button variant="destructive" onClick={() => removeAcademicInfo(idx)}><Trash2 className="h-4 w-4" /> Remove</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addAcademicInfo}><Plus className="h-4 w-4 mr-2" />Add Education</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="employment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Previous Employment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previousEmployment.map((exp, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 border-b pb-4">
                  <div>
                    <Label>Employer Name</Label>
                    <Input value={exp.employer_name} onChange={e => updatePreviousEmployment(idx, "employer_name", e.target.value)} placeholder="Enter employer name" />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={exp.designation} onChange={e => updatePreviousEmployment(idx, "designation", e.target.value)} placeholder="Enter designation" />
                  </div>
                  <div>
                    <Label>Duration From</Label>
                    <Input type="date" value={exp.duration_from} onChange={e => updatePreviousEmployment(idx, "duration_from", e.target.value)} />
                  </div>
                  <div>
                    <Label>Duration To</Label>
                    <Input type="date" value={exp.duration_to} onChange={e => updatePreviousEmployment(idx, "duration_to", e.target.value)} />
                  </div>
                  <div>
                    <Label>Salary</Label>
                    <Input value={exp.salary} onChange={e => updatePreviousEmployment(idx, "salary", e.target.value)} placeholder="Enter salary" />
                  </div>
                  <div>
                    <Label>Reason for Leaving</Label>
                    <Input value={exp.reason_for_leaving} onChange={e => updatePreviousEmployment(idx, "reason_for_leaving", e.target.value)} placeholder="Enter reason" />
                  </div>
                  <div className="flex items-end">
                    <Button variant="destructive" onClick={() => removePreviousEmployment(idx)}><Trash2 className="h-4 w-4" /> Remove</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addPreviousEmployment}><Plus className="h-4 w-4 mr-2" />Add Experience</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Health Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="blood_group">Blood Group</Label>
                <Input id="blood_group" value={employeeInfo.blood_group} onChange={e => setEmployeeInfo({ ...employeeInfo, blood_group: e.target.value })} placeholder="e.g. O+, A-" />
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" value={employeeInfo.height} onChange={e => setEmployeeInfo({ ...employeeInfo, height: e.target.value })} placeholder="e.g. 170" />
              </div>
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" value={employeeInfo.weight} onChange={e => setEmployeeInfo({ ...employeeInfo, weight: e.target.value })} placeholder="e.g. 65" />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="medical_history">Medical History</Label>
                <Textarea id="medical_history" value={employeeInfo.medical_history} onChange={e => setEmployeeInfo({ ...employeeInfo, medical_history: e.target.value })} placeholder="Describe any medical history" rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={verificationInfo.name} onChange={e => updateVerificationField("name", e.target.value)} placeholder="Enter name" />
                </div>
                <div>
                  <Label>Father's Name</Label>
                  <Input value={verificationInfo.father_name} onChange={e => updateVerificationField("father_name", e.target.value)} placeholder="Enter father's name" />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input value={verificationInfo.designation} onChange={e => updateVerificationField("designation", e.target.value)} placeholder="Enter designation" />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input value={verificationInfo.department} onChange={e => updateVerificationField("department", e.target.value)} placeholder="Enter department" />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={verificationInfo.date_of_birth} onChange={e => updateVerificationField("date_of_birth", e.target.value)} />
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <Input value={verificationInfo.pan_number} onChange={e => updateVerificationField("pan_number", e.target.value)} placeholder="Enter PAN number" />
                </div>
                <div>
                  <Label>Aadhar Number</Label>
                  <Input value={verificationInfo.aadhar_number} onChange={e => updateVerificationField("aadhar_number", e.target.value)} placeholder="Enter Aadhar number" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input value={verificationInfo.gender} onChange={e => updateVerificationField("gender", e.target.value)} placeholder="Enter gender" />
                </div>
                <div>
                  <Label>Present Address</Label>
                  <Input value={verificationInfo.present_address} onChange={e => updateVerificationField("present_address", e.target.value)} placeholder="Enter present address" />
                </div>
                <div>
                  <Label>Present Stay Period</Label>
                  <Input value={verificationInfo.present_stay_period} onChange={e => updateVerificationField("present_stay_period", e.target.value)} placeholder="Enter stay period" />
                </div>
                <div>
                  <Label>Present Contact</Label>
                  <Input value={verificationInfo.present_contact} onChange={e => updateVerificationField("present_contact", e.target.value)} placeholder="Enter contact" />
                </div>
                <div>
                  <Label>Permanent Address</Label>
                  <Input value={verificationInfo.permanent_address} onChange={e => updateVerificationField("permanent_address", e.target.value)} placeholder="Enter permanent address" />
                </div>
                <div>
                  <Label>Permanent Stay Period</Label>
                  <Input value={verificationInfo.permanent_stay_period} onChange={e => updateVerificationField("permanent_stay_period", e.target.value)} placeholder="Enter stay period" />
                </div>
                <div>
                  <Label>Permanent Contact</Label>
                  <Input value={verificationInfo.permanent_contact} onChange={e => updateVerificationField("permanent_contact", e.target.value)} placeholder="Enter contact" />
                </div>
              </div>
              {/* KYC Document Uploads - grouped, full width below main grid */}
              <div className="mt-8 space-y-6">
                <div>
                  <span className="block font-semibold mb-2">Identity & Address Proof</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="aadhaar" className="block mb-1">Aadhaar</Label>
                      <Input id="aadhaar" type="file" onChange={handleKycUpload} />
                    </div>
                    <div>
                      <Label htmlFor="utility_bill" className="block mb-1">Electricity / Utility Bill</Label>
                      <Input id="utility_bill" type="file" onChange={handleKycUpload} />
                    </div>
                    <div>
                      <Label htmlFor="pan" className="block mb-1">PAN</Label>
                      <Input id="pan" type="file" onChange={handleKycUpload} />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="block font-semibold mb-2">Education Certificates</span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="ssc" className="block mb-1">SSC Certificate</Label>
                      <Input id="ssc" type="file" onChange={handleKycUpload} />
                    </div>
                    <div>
                      <Label htmlFor="hsc" className="block mb-1">HSC Certificate</Label>
                      <Input id="hsc" type="file" onChange={handleKycUpload} />
                    </div>
                    <div>
                      <Label htmlFor="graduation" className="block mb-1">Graduation Certificate</Label>
                      <Input id="graduation" type="file" onChange={handleKycUpload} />
                    </div>
                    <div>
                      <Label htmlFor="post_graduation" className="block mb-1">Post Graduation Certificate</Label>
                      <Input id="post_graduation" type="file" onChange={handleKycUpload} />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="block font-semibold mb-2">Experience Documents</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="experience_letter" className="block mb-1">Experience Letter</Label>
                      <Input id="experience_letter" type="file" onChange={handleKycUpload} />
                    </div>
                    <div>
                      <Label htmlFor="salary_slips" className="block mb-1">Previous Company Salary Slips</Label>
                      <Input id="salary_slips" type="file" onChange={handleKycUpload} />
                    </div>
                    <div>
                      <Label htmlFor="offer_letter" className="block mb-1">Previous Company Offer / Appointment Letter</Label>
                      <Input id="offer_letter" type="file" onChange={handleKycUpload} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 mt-6">
                <FileText className="h-5 w-5" />
                Previous Employers (for Verification)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationInfo.employers.map((emp, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 border-b pb-4">
                  <div>
                    <Label>Employer Name</Label>
                    <Input value={emp.employer_name} onChange={e => updateVerificationEmployer(idx, "employer_name", e.target.value)} placeholder="Enter employer name" />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={emp.designation} onChange={e => updateVerificationEmployer(idx, "designation", e.target.value)} placeholder="Enter designation" />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={emp.location} onChange={e => updateVerificationEmployer(idx, "location", e.target.value)} placeholder="Enter location" />
                  </div>
                  <div>
                    <Label>Period of Working</Label>
                    <Input value={emp.period_of_working} onChange={e => updateVerificationEmployer(idx, "period_of_working", e.target.value)} placeholder="Enter period" />
                  </div>
                  <div>
                    <Label>Reason for Leaving</Label>
                    <Input value={emp.reason_for_leaving} onChange={e => updateVerificationEmployer(idx, "reason_for_leaving", e.target.value)} placeholder="Enter reason" />
                  </div>
                  <div>
                    <Label>Supervisor Contact</Label>
                    <Input value={emp.supervisor_contact} onChange={e => updateVerificationEmployer(idx, "supervisor_contact", e.target.value)} placeholder="Enter supervisor contact" />
                  </div>
                  <div>
                    <Label>HR Email</Label>
                    <Input value={emp.hr_mail} onChange={e => updateVerificationEmployer(idx, "hr_mail", e.target.value)} placeholder="Enter HR email" />
                  </div>
                  <div>
                    <Label>HR Contact</Label>
                    <Input value={emp.hr_contact} onChange={e => updateVerificationEmployer(idx, "hr_contact", e.target.value)} placeholder="Enter HR contact" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
