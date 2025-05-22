import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onToggleMode: () => void;
  isActive: boolean;
}

export default function RegisterForm({ onToggleMode, isActive }: RegisterFormProps) {
  const { register: registerUser, state } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    await registerUser({
      name: data.fullName,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className={cn('w-full', !isActive && 'hidden')}>
    

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <div>
          <label htmlFor="fullName" className="block  text-gray-700 text-left  ">
            Full name
          </label>
          <input
            {...register('fullName')}
            type="text"
            id="fullName"
            className={cn(
              'mt-2 w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'placeholder:text-gray-400',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.fullName ? 'border-red-300' : 'border-gray-300'
            )}
            placeholder="Enter your full name"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-base text-gray-700 text-left">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            id="email"
            className={cn(
              'mt-2 w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
              'placeholder:text-gray-400',
              'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              errors.email ? 'border-red-300' : 'border-gray-300'
            )}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-base text-gray-700 text-left">
            Password
          </label>
          <div className="relative mt-2">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
                'placeholder:text-gray-400',
                'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
                errors.password ? 'border-red-300' : 'border-gray-300'
              )}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-base text-gray-700 text-left">
            Confirm password
          </label>
          <div className="relative mt-2">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
                'placeholder:text-gray-400',
                'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              )}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={state.isLoading}
          className={cn(
            'w-full rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white',
            'hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {state.isLoading ? (
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span className="ml-2">Creating account...</span>
            </div>
          ) : (
            'Create account'
          )}
        </button>

    
      </form>
    </div>
  );
} 