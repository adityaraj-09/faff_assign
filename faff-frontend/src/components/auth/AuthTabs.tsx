import { useState } from 'react';
import { cn } from '../../utils';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

export default function AuthTabs() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('login')}
            className={cn(
              'flex-1 py-2 text-sm font-medium text-center',
              'focus:outline-none',
              activeTab === 'login'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={cn(
              'flex-1 py-2 text-sm font-medium text-center',
              'focus:outline-none',
              activeTab === 'register'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Register
          </button>
        </div>

        {/* Forms */}
        <LoginForm
          onToggleMode={() => setActiveTab('register')}
          isActive={activeTab === 'login'}
        />
        <RegisterForm
          onToggleMode={() => setActiveTab('login')}
          isActive={activeTab === 'register'}
        />
      </div>
    </div>
  );
} 