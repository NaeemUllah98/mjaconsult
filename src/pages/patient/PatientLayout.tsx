import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  CalendarCheck,
  MessageSquare,
  Megaphone,
  UserCog,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";

const nav: NavItem[] = [
  { to: "/patient", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: "/patient/doctors", label: "Find Doctors", icon: <Stethoscope className="h-5 w-5" /> },
  { to: "/patient/appointments", label: "My Appointments", icon: <CalendarCheck className="h-5 w-5" /> },
  { to: "/patient/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5" /> },
  { to: "/patient/promotions", label: "Offers", icon: <Megaphone className="h-5 w-5" /> },
  { to: "/patient/profile", label: "My Profile", icon: <UserCog className="h-5 w-5" /> },
];

export function PatientLayout() {
  return (
    <DashboardLayout nav={nav} roleLabel="Patient">
      <Outlet />
    </DashboardLayout>
  );
}
