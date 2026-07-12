import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, ShieldAlert } from 'lucide-react';

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already logged in, redirect them straight to the portal
  if (currentUser) {
    return <Navigate to="/portal" replace />;
  }

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-[24px] shadow-2xl overflow-hidden relative border border-zinc-100">
        
        {/* DARK HEADER */}
        <div className="bg-[#2D2D2D] p-6 flex flex-col items-center justify-center">
          <img src="/Logos_RE!_naranja.png" alt="RE! Logo" className="h-10 w-auto object-contain mb-1" />
          <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase">Portal Interno</p>
        </div>

        {/* BODY */}
        <div className="p-8 text-center bg-white">
          <div className="bg-zinc-50 border border-zinc-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldAlert size={28} className="text-zinc-400" strokeWidth={2.5} />
          </div>
          
          <h2 className="text-lg font-black text-zinc-900 tracking-tight mb-2">Acceso Restringido</h2>
          <p className="text-zinc-500 text-xs font-medium leading-relaxed mb-8 px-2">
            Ingresa con tu cuenta de Google corporativa. Debes estar registrado en la base de datos central para acceder.
          </p>

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-700 font-bold py-3.5 px-4 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm transition-all disabled:opacity-50"
          >
            {isLoggingIn ? (
               <div className="w-5 h-5 border-2 border-zinc-300 border-t-[#EB4511] rounded-full animate-spin"></div>
            ) : (
              <>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm">Continuar con Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}