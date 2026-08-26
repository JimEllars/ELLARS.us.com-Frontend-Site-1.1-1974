import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

const ProtectedRoute = () => {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const _hasHydrated = useAppStore(state => state._hasHydrated);
  const userToken = useAppStore(state => state.userToken);
  const clearAuth = useAppStore(state => state.clearAuth);

  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;

    // Silent validation polling
    const validateToken = async () => {
       if (!userToken) {
         setIsValidating(false);
         return;
       }

       try {
         // In a real app we'd call an endpoint to validate, e.g.
         // const res = await fetch('/api/validate', { headers: { Authorization: `Bearer ${userToken}` } });
         // if (!res.ok) { clearAuth(); }

         // Simulating valid token check
         setIsValidating(false);
       } catch(e) {
         setIsValidating(false);
       }
    };

    validateToken();
  }, [_hasHydrated, userToken, clearAuth]);

  if (!_hasHydrated || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void">
         <div className="w-8 h-8 border-2 border-yellow-electric/30 border-t-yellow-electric rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
