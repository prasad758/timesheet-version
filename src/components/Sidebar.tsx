import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home,
  Search,
  Users,
  UserCircle,
  Clock,
  Calendar,
  GitBranch,
  BarChart3,
  LogOut,
  Menu,
  FolderKanban
} from 'lucide-react';
import { Button } from './ui/button';

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Get user data from localStorage or API
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { icon: Home, label: 'Timesheet', path: '/', adminOnly: false },
    { icon: FolderKanban, label: 'Projects', path: '/projects', adminOnly: false },
    { icon: Search, label: 'Issues', path: '/issues', adminOnly: false },
    { icon: UserCircle, label: 'Profiles', path: '/profiles', adminOnly: false },
    { icon: Users, label: 'Users', path: '/users', adminOnly: true },
    { icon: BarChart3, label: 'Monitoring', path: '/monitoring', adminOnly: true },
    { icon: Clock, label: 'Time Clock', path: '/time-clock', adminOnly: false },
    { icon: Calendar, label: 'Leave Calendar', path: '/leave-calendar', adminOnly: false },
    { icon: GitBranch, label: 'Git', path: '/git', adminOnly: false },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const getUserInitial = () => {
    if (user?.full_name) {
      return user.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className={`bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">TM</span>
              </div>
              <span className="font-semibold text-gray-900">TechieMaya</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{getUserInitial()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.email || 'User'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.role || 'employee'}
              </div>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          onClick={onLogout}
          className={`w-full flex items-center space-x-3 text-gray-700 hover:bg-red-50 hover:text-red-600 ${
            isCollapsed ? 'justify-center px-3' : 'justify-start'
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );
}