import { Link, useLocation } from 'react-router-dom';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

// Map of route paths to their display names
const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Task Detail',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
  '/auth': 'Authentication'
};

export default function Header() {
  const location = useLocation();
  const { state, logout } = useAuth();
  
  // Get the current page title
  const currentTitle = routeTitles[location.pathname] || 'Dashboard';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-display font-bold text-primary-600">Faff</h1>
            <span className="ml-4 text-gray-500">|</span>
            <h2 className="ml-4 text-lg font-medium text-gray-900">{currentTitle}</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/notifications"
              className="p-2 text-gray-400 hover:text-gray-500 relative"
            >
              <BellIcon className="h-6 w-6" />
              {/* Add notification badge here if needed */}
            </Link>
            
            <div className="relative">
              <div className="flex items-center space-x-3">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
                >
                  <UserCircleIcon className="h-6 w-6" />
                  <span className="text-sm">{state.user?.name}</span>
                </Link>
                
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 