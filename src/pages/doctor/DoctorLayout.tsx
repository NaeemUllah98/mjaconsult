import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarClock,
  CalendarCheck,
  MessageSquare,
  UserCog,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";

const nav: NavItem[] = [
  { to: "/doctor", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: "/doctor/availability", label: "Availability", icon: <CalendarClock className="h-5 w-5" /> },
  { to: "/doctor/appointments", label: "Appointments", icon: <CalendarCheck className="h-5 w-5" /> },
  { to: "/doctor/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5" /> },
  { to: "/doctor/profile", label: "My Profile", icon: <UserCog className="h-5 w-5" /> },
];

export function DoctorLayout() {
  return (
    <DashboardLayout nav={nav} roleLabel="Doctor">
      <Outlet />
    </DashboardLayout>
  );
}
