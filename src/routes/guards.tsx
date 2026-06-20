import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/ui/Misc";
import type { Role } from "@/types";

/** Default landing route for each role after login. */
export const homeForRole: Record<Role, string> = {
  admin: "/admin",
  doctor: "/doctor",
  patient: "/patient",
};

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user)
    return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return <Navigate to={homeForRole[user.role]} replace />;
  return <>{children}</>;
}

/** Redirect already-authenticated users away from auth pages. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={homeForRole[user.role]} replace />;
  return <>{children}</>;
}
