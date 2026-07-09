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
  getAdditionalUserInfo,
  type User as FirebaseUser,
} from "firebase/auth";
import toast from "react-hot-toast";
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

  async function hydrate(
    fb: FirebaseUser | null,
    opts: { allowCreate?: boolean } = {},
  ): Promise<AppUser | null> {
    if (!fb) {
      setUser(null);
      return null;
    }
    let profile = await getUser(fb.uid);
    if (!profile) {
      if (!opts.allowCreate) {
        // This Firebase Auth account has no matching Firestore profile —
        // almost always because an admin removed the record. Firebase's free
        // (Spark) plan gives the client no way to delete another user's Auth
        // account directly, so removal is enforced here instead: without a
        // profile (or with one marked inactive, below) the account is signed
        // back out on every login/refresh rather than silently re-created.
        await fbSignOut(auth);
        setUser(null);
        throw new Error(
          "This account is no longer registered. Please contact support.",
        );
      }
      // Genuine first sign-in (e.g. Google) — create a base patient record,
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
    if (profile.active === false) {
      await fbSignOut(auth);
      setUser(null);
      throw new Error(
        "Your account has been disabled. Please contact support.",
      );
    }
    setUser(profile);
    return profile;
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // DEMO mode: restore the previously "signed-in" demo user, if any —
      // unless an admin disabled them since the session was saved.
      const current = demo.demoCurrentUser();
      if (current?.active === false) {
        demo.demoSignOut();
        setUser(null);
        toast.error("Your account has been disabled. Please contact support.");
      } else {
        setUser(current);
      }
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fb) => {
      setFirebaseUser(fb);
      try {
        await hydrate(fb);
      } catch (err) {
        if (fb) toast.error((err as Error).message);
      }
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
    // Only auto-provision a profile for a genuinely brand-new Google
    // sign-up. A returning Google user with no profile means an admin
    // removed their record — they must not be silently re-created.
    const isNewUser = getAdditionalUserInfo(cred)?.isNewUser ?? false;
    return (await hydrate(cred.user, { allowCreate: isNewUser }))!;
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
