import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  ArrowLeftIcon,
  UserCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { state: authState, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: authState.user?.name || '',
      email: authState.user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setProfileLoading(true);
      await apiService.updateProfile(data);
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setPasswordLoading(true);
      await apiService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Personal Information', icon: UserCircleIcon },
    { id: 'security', name: 'Security', icon: CheckCircleIcon },
    { id: 'preferences', name: 'Preferences', icon: CheckCircleIcon },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
    

      {/* Main Content */}
      <main className="max-w-4xl px-4 sm:px-6 lg:px-8 ">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-primary-50 px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="bg-primary-100 rounded-full p-6">
                <UserCircleIcon className="h-16 w-16 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-gray-900">
                  {authState.user?.name}
                </h2>
                <p className="text-gray-600">{authState.user?.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Role: {authState.user?.role === 'admin' ? 'Administrator' : 'User'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm',
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Personal Information Tab */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your account settings and preferences
                  </p>
                </div>

                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full name
                    </label>
                    <input
                      {...profileForm.register('name')}
                      type="text"
                      id="name"
                      className={cn(
                        'w-full px-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        profileForm.formState.errors.name ? 'border-red-300' : 'border-gray-300'
                      )}
                      placeholder="Enter your full name"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <input
                      {...profileForm.register('email')}
                      type="email"
                      id="email"
                      className={cn(
                        'w-full px-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        profileForm.formState.errors.email ? 'border-red-300' : 'border-gray-300'
                      )}
                      placeholder="Enter your email"
                    />
                    {profileForm.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className={cn(
                        'inline-flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white',
                        'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {profileLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </div>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Ensure your account is using a long, random password to stay secure
                  </p>
                </div>

                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Current password
                    </label>
                    <div className="relative">
                      <input
                        {...passwordForm.register('currentPassword')}
                        type={showCurrentPassword ? 'text' : 'password'}
                        id="currentPassword"
                        className={cn(
                          'w-full px-3 py-3 pr-10 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                          passwordForm.formState.errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                        )}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        {...passwordForm.register('newPassword')}
                        type={showNewPassword ? 'text' : 'password'}
                        id="newPassword"
                        className={cn(
                          'w-full px-3 py-3 pr-10 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                          passwordForm.formState.errors.newPassword ? 'border-red-300' : 'border-gray-300'
                        )}
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        {...passwordForm.register('confirmPassword')}
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        className={cn(
                          'w-full px-3 py-3 pr-10 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                          passwordForm.formState.errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        )}
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className={cn(
                        'inline-flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white',
                        'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {passwordLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Changing...
                        </div>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Customize your Faff experience
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Notifications</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Email notifications for new messages</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Email notifications for task assignments</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Browser notifications</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Display</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timezone
                        </label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option>(GMT-05:00) Eastern Time (US & Canada)</option>
                          <option>(GMT-08:00) Pacific Time (US & Canada)</option>
                          <option>(GMT+00:00) UTC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Language
                        </label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <button
                      type="button"
                      className={cn(
                        'inline-flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white',
                        'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                      )}
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 