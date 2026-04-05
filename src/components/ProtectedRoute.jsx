import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // If they aren't logged in, kick them to the login screen
    return <Navigate to="/login" replace />;
  }

  // If they are logged in, let them see the page
  return children;
}