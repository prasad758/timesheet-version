/**
 * Integrated Joining Form Page
 * Combines:
 * 1. New Hiring - 3-stage candidate recruitment process
 * 2. Joining Forms - Existing employee onboarding forms
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, FileText } from "lucide-react";
import RecruitmentPage from "../recruitment/page";
import JoiningFormList from "./JoiningFormList";

const IntegratedJoiningPage = () => {
  const [activeTab, setActiveTab] = useState("new-hiring");

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs for New Hiring vs Joining Forms */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="px-6 pt-4 border-b bg-white">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="new-hiring" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              New Hiring
            </TabsTrigger>
            <TabsTrigger value="joining-forms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Joining Forms
            </TabsTrigger>
          </TabsList>
          <p className="text-sm text-gray-500 mt-2 pb-3">
            {activeTab === "new-hiring" 
              ? "Manage 3-stage candidate hiring: Interview → Background Verification → Onboarding"
              : "Manage employee onboarding documentation and forms"
            }
          </p>
        </div>

        <TabsContent value="new-hiring" className="flex-1 m-0 overflow-auto">
          <RecruitmentPage />
        </TabsContent>

        <TabsContent value="joining-forms" className="flex-1 m-0 overflow-auto">
          <JoiningFormList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegratedJoiningPage;
