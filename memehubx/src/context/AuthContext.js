"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase"; // connecting to your firebase file
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-hot-toast"; // nice notifications

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // LOGIN Function
  const googleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Welcome to MemeHub! 😂");
    } catch (error) {
      toast.error("Login failed: " + error.message);
    }
  };

  // LOGOUT Function
  const logout = () => {
    signOut(auth);
    toast.success("See you later!");
  };

  // Check if user is logged in automatically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, googleLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use this data easily
export const useAuth = () => useContext(AuthContext);