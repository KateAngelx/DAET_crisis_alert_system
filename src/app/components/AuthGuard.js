"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/crisisStore';
import { canAccessAdmin, canAccessGuide } from '@/lib/authGuard';
import { getActiveSession } from '@/lib/authSession';

export function AuthGuard({ children, requiredRole = null, fallbackUrl = '/login' }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      const session = await getActiveSession();
      if (cancelled) return;


      if (!session) {
        router.replace(fallbackUrl);
        return;
      }

      const result = await useAuthStore.getState().fetchProfile();
      if (cancelled) return;

      const persisted = useAuthStore.getState();
      let role = result.success ? result.profile?.user_type : null;
      let accountActive = result.success ? result.profile?.is_active === true : false;

      if (!role && persisted.user?.id === session.user.id) {
        role = persisted.user.role;
        accountActive = persisted.user.is_active === true;
      }


      if (!role) {
        router.replace(fallbackUrl);
        return;
      }

      if (requiredRole === 'admin' && (!canAccessAdmin(role) || !accountActive)) {
        router.replace('/');
        return;
      }

      if (requiredRole === 'guide' && !canAccessGuide(role)) {
        router.replace('/');
        return;
      }

      setChecked(true);
    }

    setChecked(false);
    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [requiredRole, router, fallbackUrl]);

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
