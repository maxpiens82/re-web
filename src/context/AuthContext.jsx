import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 🚀 1. INSTANT CACHE CHECK: Did GAS already approve them previously?
        const cachedRole = localStorage.getItem(`re_role_${user.email}`);
        const cachedName = localStorage.getItem(`re_name_${user.email}`);
        
        if (cachedRole && cachedName) {
          // Load them instantly in 0 milliseconds. No waiting for GAS!
          setCurrentUser({ ...user, reName: cachedName });
          setUserRole(cachedRole);
          setLoading(false);
          return;
        }

        // 2. No cache found? Ask GAS for permissions (Takes 2 seconds)
        try {
          const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'staff_login', payload: { email: user.email } })
          });

          const data = await response.json();

          if (data.success) {
            // 🚀 3. SAVE TO CACHE FOR NEXT TIME
            localStorage.setItem(`re_role_${user.email}`, data.user.role);
            localStorage.setItem(`re_name_${user.email}`, data.user.name);
            
            setCurrentUser({ ...user, reName: data.user.name });
            setUserRole(data.user.role);
          } else {
            alert(data.error || "No tienes permisos. Tu email no está en la base de datos.");
            await signOut(auth);
            setCurrentUser(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error verifying with GAS:", error);
          alert("Error de conexión con la base de datos RE!");
          await signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  
  const logout = async () => {
    // Clean up the cache when they log out
    if (auth.currentUser) {
      localStorage.removeItem(`re_role_${auth.currentUser.email}`);
      localStorage.removeItem(`re_name_${auth.currentUser.email}`);
    }
    await signOut(auth);
    setCurrentUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userRole, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);