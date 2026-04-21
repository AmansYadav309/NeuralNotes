import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAo6ulcBl5D5Zx3ULMM5MPtY34M8el1kpU",
  authDomain: "neuralnotes-37d99.firebaseapp.com",
  projectId: "neuralnotes-37d99",
  storageBucket: "neuralnotes-37d99.firebasestorage.app",
  messagingSenderId: "195959436253",
  appId: "1:195959436253:web:7ee17c44bd5010e3e47c34",
  measurementId: "G-YJKZWEPTGY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
    return signInWithPopup(auth, googleProvider);
};

export const logout = async () => {
    return signOut(auth);
};

export { app, auth, db };
