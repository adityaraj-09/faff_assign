import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils';
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  KeyIcon,
  UserCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Squares2X2Icon,
  },

  {
    name: 'Profile',
    href: '/profile',
    icon: UserCircleIcon,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: BellIcon,
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { state } = useAuth();
  const user = state.user;

  return (
    <div className="flex h-full w-64 flex-col bg-white">
      {/* Logo */}
      <div className="p-6">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold text-primary-600">Faff</h1>
          <p className="text-gray-500">Ticketing System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <item.icon
                className={cn(
                  'h-6 w-6',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="border-t border-gray-200 p-4">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              {user.name ? user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() : ""}
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">Support Agent</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
} 