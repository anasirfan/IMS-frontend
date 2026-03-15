'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (formData: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await authService.login(formData.email, formData.password);
      if (res.success && res.data) {
        setAuth(res.data.admin, res.data.accessToken, res.data.refreshToken);
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        toast.error(res.message || 'Login failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stealth-300 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-stealth-400 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald/5 to-transparent" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-eton/5 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md relative z-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald/20 flex items-center justify-center shadow-glow">
              <Zap size={24} className="text-emerald" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Limi Stealth</h1>
              <p className="text-xs text-gray-500 tracking-widest uppercase">Interview Management System</p>
            </div>
          </div>
          <p className="text-gray-400 leading-relaxed text-sm">
            AI-powered recruitment operating system. Automate your hiring pipeline with 
            intelligent CV parsing, automated scheduling, and post-interview scoring.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-emerald text-xl font-bold">1000+</p>
              <p className="text-gray-500 text-xs">Candidates Managed</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-emerald text-xl font-bold">AI</p>
              <p className="text-gray-500 text-xs">Powered Scoring</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <Zap size={20} className="text-emerald" />
            <h1 className="text-xl font-bold text-gray-100">Limi Stealth</h1>
          </div>

          <h2 className="text-xl font-semibold text-gray-100 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-8">Sign in to access the recruitment dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@limi.com"
                  className="input-field pl-10"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="input-field pl-10 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-stealth/30 border-t-stealth rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </motion.div>
      </div>
    </div>
  );
}
