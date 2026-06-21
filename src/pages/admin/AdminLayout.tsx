import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CalendarCheck,
  MessageSquare,
  Megaphone,
  FileSpreadsheet,
  Settings,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";

const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: "/admin/doctors", label: "Doctors", icon: <Stethoscope className="h-5 w-5" /> },
  { to: "/admin/patients", label: "Patients", icon: <Users className="h-5 w-5" /> },
  { to: "/admin/appointments", label: "Appointments", icon: <CalendarCheck className="h-5 w-5" /> },
  { to: "/admin/messages", label: "Conversations", icon: <MessageSquare className="h-5 w-5" /> },
  { to: "/admin/promotions", label: "Promotions", icon: <Megaphone className="h-5 w-5" /> },
  { to: "/admin/export", label: "Data export", icon: <FileSpreadsheet className="h-5 w-5" /> },
  { to: "/admin/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
];

export function AdminLayout() {
  return (
    <DashboardLayout nav={nav} roleLabel="Administrator">
      <Outlet />
    </DashboardLayout>
  );
}
