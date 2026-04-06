import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDZIDhAykoXII0TAz33HkI56v37Wg9Ykk0",
  authDomain: "re-o-matic.firebaseapp.com",
  projectId: "re-o-matic",
  storageBucket: "re-o-matic.firebasestorage.app",
  messagingSenderId: "900479962872",
  appId: "1:900479962872:web:87e72ddb029f8d9d8ff50d",
  measurementId: "G-3P4B2V8H3F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();