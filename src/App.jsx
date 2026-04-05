import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
        {/* Temporary Dev Nav */}
        <div style={{ background: '#222', padding: '10px', textAlign: 'center', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>🏠 Simulador</Link>
          <Link to="/login" style={{ color: '#48bb78', textDecoration: 'none', fontWeight: 'bold' }}>🔐 Staff Login</Link>
          <Link to="/portal" style={{ color: '#2B6CB0', textDecoration: 'none', fontWeight: 'bold' }}>💼 Portal</Link>
        </div>

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/staging" element={<Stager />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Staff Only) */}
          <Route 
            path="/portal" 
            element={
              <ProtectedRoute>
                <Portal /> {/* <--- THIS IS THE FIX */}
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}