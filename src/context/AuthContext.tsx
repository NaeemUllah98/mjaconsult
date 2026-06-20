import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { getUser, upsertUser } from "@/lib/api";
import * as demo from "@/lib/demo/backend";
import type { AppUser, Role } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  registerPatient: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<AppUser>;
  login: (email: string, password: string) => Promise<AppUser>;
  loginWithGoogle: () => Promise<AppUser>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate(fb: FirebaseUser | null): Promise<AppUser | null> {
    if (!fb) {
      setUser(null);
      return null;
    }
    let profile = await getUser(fb.uid);
    if (!profile) {
      // First sign-in (e.g. Google) — create a base patient record,
      // unless the email is the configured bootstrap admin.
      const role: Role =
        fb.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "patient";
      profile = {
        uid: fb.uid,
        role,
        name: fb.displayName ?? fb.email?.split("@")[0] ?? "User",
        email: fb.email ?? "",
        photoURL: fb.photoURL ?? "",
        active: true,
      };
      await upsertUser(profile);
    }
    setUser(profile);
    return profile;
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // DEMO mode: restore the previously "signed-in" demo user, if any.
      setUser(demo.demoCurrentUser());
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fb) => {
      setFirebaseUser(fb);
      await hydrate(fb);
      setLoading(false);
    });
    return unsub;
  }, []);

  const registerPatient: AuthContextValue["registerPatient"] = async (
    name,
    email,
    phone,
    password,
  ) => {
    if (demo.DEMO) {
      const u = demo.demoRegister(name, email, phone);
      setUser(u);
      return u;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const role: Role = email.toLowerCase() === ADMIN_EMAIL ? "admin" : "patient";
    await upsertUser({
      uid: cred.user.uid,
      role,
      name,
      email,
      phone,
      active: true,
    });
    return (await hydrate(cred.user))!;
  };

  const login: AuthContextValue["login"] = async (email, password) => {
    if (demo.DEMO) {
      const u = demo.demoLogin(email, password);
      setUser(u);
      return u;
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return (await hydrate(cred.user))!;
  };

  const loginWithGoogle = async () => {
    if (demo.DEMO) {
      const u = demo.demoLogin("patient@mjaconsult.com", "patient123");
      setUser(u);
      return u;
    }
    const cred = await signInWithPopup(auth, googleProvider);
    return (await hydrate(cred.user))!;
  };

  const resetPassword = async (email: string) => {
    if (demo.DEMO) return;
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    if (demo.DEMO) {
      demo.demoSignOut();
      setUser(null);
      return;
    }
    await fbSignOut(auth);
    setUser(null);
  };

  const refreshUser = async () => {
    if (demo.DEMO) {
      setUser(demo.demoCurrentUser());
      return;
    }
    if (firebaseUser) await hydrate(firebaseUser);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        configured: isFirebaseConfigured,
        registerPatient,
        login,
        loginWithGoogle,
        resetPassword,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
