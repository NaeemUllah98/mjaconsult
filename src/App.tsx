import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "@/components/ui/Misc";
import { DemoBanner } from "@/components/shared/DemoBanner";
import { RequireRole, RedirectIfAuthed } from "@/routes/guards";
import { PatientLayout } from "@/pages/patient/PatientLayout";
import { DoctorLayout } from "@/pages/doctor/DoctorLayout";
import { AdminLayout } from "@/pages/admin/AdminLayout";

// Public
const Landing = lazy(() => import("@/pages/public/Landing"));
// Auth
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
// Patient
const PatientDashboard = lazy(() => import("@/pages/patient/Dashboard"));
const BrowseDoctors = lazy(() => import("@/pages/patient/BrowseDoctors"));
const DoctorProfile = lazy(() => import("@/pages/patient/DoctorProfile"));
const PatientAppointments = lazy(() => import("@/pages/patient/Appointments"));
const PatientPrescriptions = lazy(() => import("@/pages/patient/Prescriptions"));
const PatientChat = lazy(() => import("@/pages/patient/Chat"));
const PatientPromotions = lazy(() => import("@/pages/patient/Promotions"));
const PatientProfile = lazy(() => import("@/pages/patient/Profile"));
// Doctor
const DoctorDashboard = lazy(() => import("@/pages/doctor/Dashboard"));
const DoctorAvailability = lazy(() => import("@/pages/doctor/Availability"));
const DoctorAppointments = lazy(() => import("@/pages/doctor/Appointments"));
const DoctorChat = lazy(() => import("@/pages/doctor/Chat"));
const DoctorProfileEdit = lazy(() => import("@/pages/doctor/Profile"));
// Admin
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminDoctors = lazy(() => import("@/pages/admin/Doctors"));
const AdminPatients = lazy(() => import("@/pages/admin/Patients"));
const AdminAppointments = lazy(() => import("@/pages/admin/Appointments"));
const AdminMessages = lazy(() => import("@/pages/admin/Messages"));
const AdminPromotions = lazy(() => import("@/pages/admin/Promotions"));
const AdminDataExport = lazy(() => import("@/pages/admin/DataExport"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const AdminBanners = lazy(() => import("@/pages/admin/Banners"));
const AdminPrescriptions = lazy(() => import("@/pages/admin/Prescriptions"));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DemoBanner />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />

        {/* Auth */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <Register />
            </RedirectIfAuthed>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Patient */}
        <Route
          path="/patient"
          element={
            <RequireRole role="patient">
              <PatientLayout />
            </RequireRole>
          }
        >
          <Route index element={<PatientDashboard />} />
          <Route path="doctors" element={<BrowseDoctors />} />
          <Route path="doctors/:id" element={<DoctorProfile />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="prescriptions" element={<PatientPrescriptions />} />
          <Route path="chat" element={<PatientChat />} />
          <Route path="promotions" element={<PatientPromotions />} />
          <Route path="profile" element={<PatientProfile />} />
        </Route>

        {/* Doctor */}
        <Route
          path="/doctor"
          element={
            <RequireRole role="doctor">
              <DoctorLayout />
            </RequireRole>
          }
        >
          <Route index element={<DoctorDashboard />} />
          <Route path="availability" element={<DoctorAvailability />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="chat" element={<DoctorChat />} />
          <Route path="profile" element={<DoctorProfileEdit />} />
        </Route>

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="prescriptions" element={<AdminPrescriptions />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="export" element={<AdminDataExport />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
