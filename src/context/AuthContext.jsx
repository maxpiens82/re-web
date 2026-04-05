import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin', 'producer', 'editor'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. User is logged into Google. Now we ask GAS if they have permissions.
          const response = await fetch(GAS_API_URL, {
            method: 'POST',
            // We use text/plain to avoid CORS preflight failures in Google Apps Script
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'staff_login',
              payload: { email: user.email }
            })
          });

          const data = await response.json();

          if (data.success) {
            // 2. GAS Approved! Save their data and role.
            setCurrentUser({ ...user, reName: data.user.name });
            setUserRole(data.user.role);
          } else {
            // 3. GAS Rejected! Not in the Valores sheet.
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
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, loginWithGoogle, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);