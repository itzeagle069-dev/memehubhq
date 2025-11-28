import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// YOUR REAL KEYS (Do not change these)
const firebaseConfig = {
  apiKey: "AIzaSyAkZ-DCPgFJoT7Y247vd0wcl7T5ot0H4tU",
  authDomain: "memehub-eagle.firebaseapp.com",
  projectId: "memehub-eagle",
  storageBucket: "memehub-eagle.firebasestorage.app",
  messagingSenderId: "218622796706",
  appId: "1:218622796706:web:e03179af1337b57ad2c8fb",
  measurementId: "G-DV9FXHK1ZY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// EXPORT THE TOOLS (The app needs these lines to work!)
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);