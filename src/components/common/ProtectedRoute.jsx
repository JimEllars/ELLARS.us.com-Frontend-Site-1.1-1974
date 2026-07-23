import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

const ProtectedRoute = () => {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
