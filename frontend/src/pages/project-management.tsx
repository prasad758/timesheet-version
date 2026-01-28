import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderKanban, Search } from 'lucide-react';
import Projects from '@features/projects';
import Issues from '@features/issues';

const tabs = [
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'issues', label: 'Issues', icon: Search },
];

export default function ProjectManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Local tab state only
  const [activeTab, setActiveTab] = useState('projects');
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FolderKanban className="h-6 w-6 mr-2" /> Project Management
        </h1>
      </div>
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'projects' && <Projects />}
        {activeTab === 'issues' && <Issues />}
      </div>
    </div>
  );
}
