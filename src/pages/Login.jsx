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
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <div className="bg-[#EB4511] p-8 text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-widest uppercase">RE!</h1>
          <p className="text-white/80 text-sm mt-2 font-medium tracking-widest uppercase">Staff Portal</p>
        </div>

        <div className="p-8 text-center">
          <div className="bg-[#EB4511]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} className="text-[#EB4511]" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
          <p className="text-gray-500 text-sm mb-8">
            Ingresa con tu cuenta de Google corporativa. Debes estar registrado en la hoja de Valores para acceder.
          </p>

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            {isLoggingIn ? (
               <div className="w-5 h-5 border-2 border-gray-400 border-t-[#EB4511] rounded-full animate-spin"></div>
            ) : (
              <>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Continuar con Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}