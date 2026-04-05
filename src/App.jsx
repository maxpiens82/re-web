import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Stager from './pages/Stager'; // Un-commented!

export default function App() {
  return (
    <Router>
      {/* 
        This is a temporary hidden navigation bar just for you to click between pages during development. 
        We will remove this later and build a real navigation menu!
      */}
      <div style={{ background: '#222', padding: '10px', textAlign: 'center', display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>🏠 Simulador</Link>
        <Link to="/staging" style={{ color: '#EB4511', textDecoration: 'none', fontWeight: 'bold' }}>✨ AI Stager</Link>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/staging" element={<Stager />} /> {/* Un-commented! */}
      </Routes>
    </Router>
  );
}