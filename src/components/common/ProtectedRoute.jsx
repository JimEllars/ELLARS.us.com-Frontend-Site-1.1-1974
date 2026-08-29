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
         <div className="w-8 h-8 border-2 border-yellow-electric/30 border-t-yellow-electric rounded-full animate-spin mb-4"></div>
         <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">Verifying Authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
