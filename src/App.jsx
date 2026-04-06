import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Stager from './pages/Stager';
import Login from './pages/Login';
import Portal from './pages/Portal';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/staging" element={<Stager />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Staff Only - Hidden from public navigation) */}
          <Route 
            path="/portal" 
            element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}