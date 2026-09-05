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

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'AuthGuard.js:session',message:'Session check after hydration',data:{hasSession:!!session,userId:session?.user?.id,requiredRole,persistedAuth:useAuthStore.getState().isAuthenticated},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!session) {
        router.replace(fallbackUrl);
        return;
      }

      const result = await useAuthStore.getState().fetchProfile();
      if (cancelled) return;

      let role = result.success ? result.profile?.user_type : null;

      if (!role) {
        const persisted = useAuthStore.getState();
        if (persisted.user?.id === session.user.id) {
          role = persisted.user.role;
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'AuthGuard.js:role',message:'Role resolved for guard',data:{role,fetchSuccess:result.success,requiredRole},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!role) {
        router.replace(fallbackUrl);
        return;
      }

      if (requiredRole === 'admin' && !canAccessAdmin(role)) {
        router.replace('/');
        return;
      }

      if (requiredRole === 'guide' && !canAccessGuide(role)) {
        router.replace('/');
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'AuthGuard.js:granted',message:'Access granted',data:{role,requiredRole},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
