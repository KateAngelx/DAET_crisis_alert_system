"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/crisisStore';
import { canAccessAdmin, canAccessGuide } from '@/lib/authGuard';

export function AuthGuard({ children, requiredRole = null, fallbackUrl = '/login' }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace(fallbackUrl);
      return;
    }

    if (requiredRole === 'admin' && !canAccessAdmin(user.role)) {
      router.replace('/');
      return;
    }

    if (requiredRole === 'guide' && !canAccessGuide(user.role)) {
      router.replace('/');
      return;
    }

    setChecked(true);
  }, [isAuthenticated, user, requiredRole, router, fallbackUrl]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-gray-400 font-bold uppercase text-xs tracking-widest">
          Verifying access...
        </div>
      </div>
    );
  }

  return children;
}
