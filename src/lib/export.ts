import * as XLSX from "xlsx";
import { formatDate, formatSlot } from "@/utils/format";
import type { AppUser, Doctor, Appointment, Promotion } from "@/types";

type Row = (string | number)[];

/**
 * Build a worksheet with a bold-ish title in A1 (merged across the columns),
 * a header row, then the data rows. SheetJS community edition is free.
 */
function sheetWithTitle(title: string, headers: string[], rows: Row[]) {
  const aoa: Row[] = [[title], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Merge the title across all columns.
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } },
  ];
  // Reasonable default column widths.
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  return ws;
}

function patientSheet(patients: AppUser[]) {
  const headers = ["Name", "Email", "Phone", "Status", "Joined"];
  const rows: Row[] = patients.map((p) => [
    p.name,
    p.email,
    p.phone ?? "",
    p.active ? "Active" : "Inactive",
    formatDate(p.createdAt ?? null),
  ]);
  return sheetWithTitle("MJACONSULT — Patients", headers, rows);
}

function doctorSheet(doctors: Doctor[]) {
  const headers = [
    "Name",
    "Specialization",
    "Email",
    "Phone",
    "Fee",
    "Currency",
    "Experience (yrs)",
    "Rating",
    "Status",
  ];
  const rows: Row[] = doctors.map((d) => [
    d.name,
    d.specialization ?? "",
    d.email,
    d.phone ?? "",
    d.fees ?? 0,
    d.currency ?? "USD",
    d.experienceYears ?? 0,
    d.rating ?? "",
    d.active ? "Active" : "Inactive",
  ]);
  return sheetWithTitle("MJACONSULT — Doctors", headers, rows);
}

function appointmentSheet(appts: Appointment[]) {
  const headers = [
    "Date",
    "Time",
    "Patient",
    "Doctor",
    "Specialization",
    "Status",
    "Payment",
    "Fee",
    "Offer",
  ];
  const rows: Row[] = appts.map((a) => [
    formatDate(a.date),
    formatSlot(a.slot),
    a.patientName,
    a.doctorName,
    a.doctorSpecialization ?? "",
    a.status,
    a.isFree ? "free" : a.paymentStatus,
    a.fee ?? 0,
    a.promoTitle ?? "",
  ]);
  return sheetWithTitle("MJACONSULT — Appointments", headers, rows);
}

function promotionSheet(promos: Promotion[]) {
  const headers = ["Title", "Type", "Discount", "Active", "Expires"];
  const rows: Row[] = promos.map((p) => [
    p.title,
    p.type,
    p.discountType === "percent"
      ? `${p.discountValue ?? 0}%`
      : p.discountType === "flat"
        ? `${p.discountValue ?? 0} off`
        : p.discountType === "free"
          ? "Free"
          : "—",
    p.active ? "Yes" : "No",
    p.expiresAt ? formatDate(p.expiresAt) : "",
  ]);
  return sheetWithTitle("MJACONSULT — Promotions", headers, rows);
}

function download(wb: XLSX.WorkBook, filename: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}

export function exportPatients(patients: AppUser[]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, patientSheet(patients), "Patients");
  download(wb, "mjaconsult-patients");
}

export function exportDoctors(doctors: Doctor[]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, doctorSheet(doctors), "Doctors");
  download(wb, "mjaconsult-doctors");
}

export function exportAppointments(appts: Appointment[]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, appointmentSheet(appts), "Appointments");
  download(wb, "mjaconsult-appointments");
}

/** Whole-hospital export: every dataset as a titled sheet in one workbook. */
export function exportAll(data: {
  patients: AppUser[];
  doctors: Doctor[];
  appointments: Appointment[];
  promotions: Promotion[];
}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, patientSheet(data.patients), "Patients");
  XLSX.utils.book_append_sheet(wb, doctorSheet(data.doctors), "Doctors");
  XLSX.utils.book_append_sheet(
    wb,
    appointmentSheet(data.appointments),
    "Appointments",
  );
  XLSX.utils.book_append_sheet(
    wb,
    promotionSheet(data.promotions),
    "Promotions",
  );
  download(wb, "mjaconsult-hospital-data");
}
