"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseServices } from "@/lib/firebase";

interface AuthContextValue {
  /** `undefined` while Firebase restores the session, `null` when signed out. */
  user: User | null | undefined;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, setUser);
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    const { auth } = getFirebaseServices();
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    return credential.user;
  }, []);
  const signOut = useCallback(async () => {
    const { auth } = getFirebaseServices();
    await firebaseSignOut(auth);
  }, []);
  const value = useMemo(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}

/** Friendly copy for Firebase Auth error codes (email/password only). */
export function describeAuthError(error: unknown) {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password. Admin accounts are created in the Firebase console.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/user-disabled":
      return "This admin account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled for this Firebase project.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
