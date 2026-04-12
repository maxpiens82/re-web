import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingLogo from './LoadingLogo';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  // THE HANDOFF: Instantly show the flipping logo with NO text
  if (loading) {
    return (
      <div className="bg-[#F0F2F5] min-h-screen w-full m-0 flex items-center justify-center">
        <LoadingLogo />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}