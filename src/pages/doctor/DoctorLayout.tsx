import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarClock,
  CalendarCheck,
  MessageSquare,
  UserCog,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { startPresence } from "@/lib/presence";

const nav: NavItem[] = [
  { to: "/doctor", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: "/doctor/availability", label: "Availability", icon: <CalendarClock className="h-5 w-5" /> },
  { to: "/doctor/appointments", label: "Appointments", icon: <CalendarCheck className="h-5 w-5" /> },
  { to: "/doctor/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5" /> },
  { to: "/doctor/profile", label: "My Profile", icon: <UserCog className="h-5 w-5" /> },
];

export function DoctorLayout() {
  const { user } = useAuth();

  // Broadcast online/offline presence so the admin can see active doctors.
  useEffect(() => {
    if (!user?.uid) return;
    return startPresence(user.uid);
  }, [user?.uid]);

  return (
    <DashboardLayout nav={nav} roleLabel="Doctor">
      <Outlet />
    </DashboardLayout>
  );
}
