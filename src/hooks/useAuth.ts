'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { admin, isAuthenticated, isLoading, setAuth, clearAuth, initialize, setLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      initialize();
      const token = localStorage.getItem('accessToken');
      if (token && !admin) {
        try {
          const res = await authService.getMe();
          if (res.success && res.data) {
            const refreshToken = localStorage.getItem('refreshToken') || '';
            setAuth(res.data, token, refreshToken);
          } else {
            clearAuth();
          }
        } catch {
          clearAuth();
        }
      } else if (!token) {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, requireAuth, router]);

  return { admin, isAuthenticated, isLoading };
}
