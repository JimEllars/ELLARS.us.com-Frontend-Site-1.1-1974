import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { verifySession } from '@/lib/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const ProtectedRoute = () => {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isOnline = useNetworkStatus();
  const _hasHydrated = useAppStore(state => state._hasHydrated);
  const isHydrating = useAppStore(state => state.isHydrating);
  const userToken = useAppStore(state => state.userToken);
  const clearAuth = useAppStore(state => state.clearAuth);

  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Wait until Zustand finishes hydrating local storage
    if (isHydrating || !_hasHydrated) return;

    // Silent validation polling
    const validateToken = async () => {
       if (!userToken) {
         setIsValidating(false);
         return;
       }

       try {
         if (import.meta.env.DEV) console.log("[ProtectedRoute] Initiating silent token validation...");

         // If offline, trust the local token until network recovers
         if (!isOnline) {
             if (import.meta.env.DEV) console.log("[ProtectedRoute] Offline mode: bypassing session verification, preserving token.");
             setIsValidating(false);
             return;
         }

         // Verify token validity against the backend silently
         const session = await verifySession();
         if (!session) {
            if (import.meta.env.DEV) console.log("[ProtectedRoute] Validation failed. Clearing auth state.");
            clearAuth();
         } else {
            if (import.meta.env.DEV) console.log("[ProtectedRoute] Validation succeeded. Session verified.");
         }
       } catch(e) {
         if (import.meta.env.DEV) console.error("[ProtectedRoute] Exception during validation:", e);
         // Instead of immediate logout on network drop, handle transient network drop
         if (isOnline) {
             clearAuth();
         }
       } finally {
         setIsValidating(false);
       }
    };

    validateToken();

    // Heartbeat to keep session alive and valid without blocking the UI
    const interval = setInterval(async () => {
        if (userToken && isOnline) {
            try {
                if (import.meta.env.DEV) console.log("[ProtectedRoute] Running session heartbeat...");
                const session = await verifySession();
                if (!session) {
                    if (import.meta.env.DEV) console.log("[ProtectedRoute] Heartbeat failed. Clearing auth state.");
                    clearAuth();
                } else {
                    if (import.meta.env.DEV) console.log("[ProtectedRoute] Heartbeat verified.");
                }
            } catch (e) {
                if (import.meta.env.DEV) console.error("[ProtectedRoute] Heartbeat exception:", e);
            }
        }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);

  }, [_hasHydrated, isHydrating, userToken, clearAuth, isOnline]);

  if (!_hasHydrated || isHydrating || isValidating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-void">
        <div className="flex items-center justify-center animate-pulse">
          <div className="w-12 h-12 border border-white/5 rounded flex items-center justify-center bg-white/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" className="text-yellow-electric/20"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" className="text-white/10"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" className="text-white/10"/>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
