import { addDays, format, subDays } from "date-fns";
import { generateSlots } from "@/utils/slots";
import type {
  AppUser,
  Doctor,
  Appointment,
  Promotion,
  Prescription,
  ChatThread,
  ChatMessage,
  AppNotification,
  TimeSlot,
  Weekday,
  PaymentSettings,
  SiteSettings,
  Banner,
} from "@/types";

export interface DemoDB {
  users: AppUser[];
  doctors: Doctor[];
  appointments: Appointment[];
  promotions: Promotion[];
  prescriptions: Prescription[];
  chats: ChatThread[];
  messages: Record<string, ChatMessage[]>;
  notifications: AppNotification[];
  /** Admin-set password overrides (uid -> password), demo only. */
  passwordOverrides: Record<string, string>;
  /** Admin-editable payment accounts shown on the booking popup. */
  paymentSettings: PaymentSettings;
  /** Public site settings (e.g. promoted homepage doctor). */
  siteSettings: SiteSettings;
  /** Homepage banner/video slideshow items. */
  banners: Banner[];
  currentUid: string | null;
}

// ---- Stamps -------------------------------------------------------------
// Inline SVG seals used as zero-cost defaults / demo samples. In a real
// deployment the admin uploads PNG stamps (Cloudinary) which replace these.

const svgDataUri = (svg: string) =>
  `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

/** Universal MJACONSULT circular company seal (default until admin uploads). */
export const DEFAULT_COMPANY_STAMP = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <path id="rxTop" d="M 28,100 A 72,72 0 0 1 172,100"/>
    <path id="rxBot" d="M 40,100 A 60,60 0 0 0 160,100"/>
  </defs>
  <circle cx="100" cy="100" r="94" fill="none" stroke="#0d3b54" stroke-width="3"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#2a9d8f" stroke-width="2"/>
  <text font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="#0d3b54" letter-spacing="2">
    <textPath href="#rxTop" startOffset="50%" text-anchor="middle">MJACONSULT</textPath>
  </text>
  <text font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#2a9d8f" letter-spacing="3">
    <textPath href="#rxBot" startOffset="50%" text-anchor="middle">ONLINE HEALTH CARE</textPath>
  </text>
  <g transform="translate(100,106)">
    <path d="M0,-13 C -7,-25 -27,-13 0,9 C 27,-13 7,-25 0,-13 Z" fill="#2c7da0"/>
    <path d="M-19,3 H -7 L -3,-9 L 3,11 L 8,1 H 19" fill="none" stroke="#0d3b54" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="100" y="150" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#1b4f6c" letter-spacing="2" text-anchor="middle">VERIFIED</text>
</svg>`);

/** A stylised doctor signature stamp for demo doctors. */
const doctorStamp = (name: string, line1: string, line2: string) =>
  svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 130">
  <text x="22" y="52" font-family="'Segoe Script','Brush Script MT',cursive" font-size="38" font-style="italic" font-weight="700" fill="#0d3b54">${name}</text>
  <line x1="20" y1="66" x2="300" y2="66" stroke="#2a9d8f" stroke-width="1.6"/>
  <text x="24" y="88" font-family="Arial, sans-serif" font-size="16" font-style="italic" fill="#1b4f6c">${line1}</text>
  <text x="24" y="108" font-family="Arial, sans-serif" font-size="14" font-style="italic" fill="#2c7da0">${line2}</text>
</svg>`);

/** Default site settings — empty means the landing page auto-picks a doctor. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  featuredDoctorId: "",
  companyStampUrl: DEFAULT_COMPANY_STAMP,
};

/** Sample homepage banners shown in demo mode. */
export const DEFAULT_BANNERS: Banner[] = [
  {
    id: "demo-banner-1",
    type: "image",
    url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1280&q=80",
    title: "World-Class Healthcare, Online",
    subtitle: "Consult qualified doctors from the comfort of your home — secure, fast and affordable.",
    link: "/register",
    linkLabel: "Book a consultation",
    active: true,
    order: 1,
    createdAt: new Date(),
  },
  {
    id: "demo-banner-2",
    type: "image",
    url: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1280&q=80",
    title: "Free Heart Health Campaign",
    subtitle: "Dr. Sarah Khan is offering free cardiology consultations every Friday this month.",
    link: "/register",
    linkLabel: "Claim your free slot",
    active: true,
    order: 2,
    createdAt: new Date(),
  },
  {
    id: "demo-banner-3",
    type: "image",
    url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1280&q=80",
    title: "New Patients Get 20% Off",
    subtitle: "Register today and get 20% off your first online consultation with any specialist.",
    link: "/register",
    linkLabel: "Register now",
    active: false,
    order: 3,
    createdAt: new Date(),
  },
];

/** Default placeholder payment accounts for demo mode. */
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  pkAccount: {
    bank: "Meezan Bank (Pakistan)",
    title: "MJACONSULT",
    number: "PK00 MEZN 0000 0000 0000 0000",
  },
  uaeAccount: {
    bank: "Emirates NBD (UAE)",
    title: "MJACONSULT",
    number: "AE00 0000 0000 0000 0000 000",
  },
  instructions:
    "Transfer the consultation fee to either account, then upload your payment proof for verification.",
};

/** Demo login credentials shown on the sign-in screen. */
export const DEMO_CREDENTIALS = [
  { role: "Admin", email: "admin@mjaconsult.com", password: "admin123", uid: "demo-admin" },
  { role: "Doctor", email: "doctor@mjaconsult.com", password: "doctor123", uid: "demo-doc-1" },
  { role: "Patient", email: "patient@mjaconsult.com", password: "patient123", uid: "demo-patient" },
] as const;

/** uid -> password (for all demo accounts, incl. extra doctors). */
export const DEMO_PASSWORDS: Record<string, string> = {
  "demo-admin": "admin123",
  "demo-doc-1": "doctor123",
  "demo-doc-2": "doctor123",
  "demo-doc-3": "doctor123",
  "demo-doc-4": "doctor123",
  "demo-doc-5": "doctor123",
  "demo-patient": "patient123",
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const days = (...d: Weekday[]) => d;

function avail(weekdays: Weekday[], start: string, end: string, dur = 30) {
  const slots = generateSlots(start, end, dur);
  const map: Partial<Record<Weekday, TimeSlot[]>> = {};
  weekdays.forEach((w) => (map[w] = slots));
  return map;
}

export function buildSeed(): DemoDB {
  const today = new Date();

  const doctors: Doctor[] = [
    {
      uid: "demo-doc-1",
      role: "doctor",
      name: "Dr. Sarah Khan",
      email: "doctor@mjaconsult.com",
      phone: "+1 555 010 2020",
      active: true,
      specialization: "Cardiologist",
      qualifications: "MBBS, MD (Cardiology)",
      experienceYears: 12,
      languages: ["English", "Urdu"],
      bio: "Consultant cardiologist focused on preventive heart care, hypertension and arrhythmia management. Warm, patient-first approach.",
      fees: 60,
      currency: "USD",
      rating: 4.9,
      reviewCount: 214,
      availability: avail(days("monday", "tuesday", "wednesday", "thursday", "friday"), "09:00", "13:00"),
      slotDurationMins: 30,
      timezone: "Asia/Karachi",
      stampUrl: doctorStamp("Dr. Sarah Khan", "Consultant Cardiologist", "MBBS, MD (Cardiology)"),
      online: true,
      lastSeenAt: today,
      createdAt: subDays(today, 120),
    },
    {
      uid: "demo-doc-2",
      role: "doctor",
      name: "Dr. Ahmed Ali",
      email: "ahmed@mjaconsult.com",
      phone: "+1 555 030 4040",
      active: true,
      specialization: "Dermatologist",
      qualifications: "MBBS, FCPS (Dermatology)",
      experienceYears: 8,
      languages: ["English", "Arabic"],
      bio: "Skin, hair and nail specialist treating acne, eczema and cosmetic concerns with evidence-based care.",
      fees: 45,
      currency: "USD",
      rating: 4.7,
      reviewCount: 96,
      availability: avail(days("monday", "wednesday", "friday"), "14:00", "18:00"),
      slotDurationMins: 30,
      timezone: "Asia/Karachi",
      createdAt: subDays(today, 90),
    },
    {
      uid: "demo-doc-3",
      role: "doctor",
      name: "Dr. Maria Garcia",
      email: "maria@mjaconsult.com",
      phone: "+1 555 050 6060",
      active: true,
      specialization: "Pediatrician",
      qualifications: "MBBS, DCH",
      experienceYears: 15,
      languages: ["English", "Spanish"],
      bio: "Caring pediatrician for newborns to teens — vaccinations, growth, nutrition and common childhood illnesses.",
      fees: 50,
      currency: "USD",
      rating: 4.95,
      reviewCount: 320,
      availability: avail(days("tuesday", "thursday"), "10:00", "15:00"),
      slotDurationMins: 30,
      timezone: "Asia/Karachi",
      online: true,
      lastSeenAt: today,
      createdAt: subDays(today, 200),
    },
    {
      uid: "demo-doc-4",
      role: "doctor",
      name: "Dr. John Smith",
      email: "john@mjaconsult.com",
      phone: "+1 555 070 8080",
      active: true,
      specialization: "Neurologist",
      qualifications: "MBBS, MD, DM (Neurology)",
      experienceYears: 18,
      languages: ["English"],
      bio: "Neurologist managing migraine, epilepsy and movement disorders with a holistic treatment plan.",
      fees: 80,
      currency: "USD",
      rating: 4.8,
      reviewCount: 150,
      availability: avail(days("monday", "tuesday", "wednesday", "thursday"), "11:00", "16:00"),
      slotDurationMins: 30,
      timezone: "Asia/Karachi",
      stampUrl: doctorStamp("Dr. John Smith", "Specialist in Neurology", "Stroke Specialist"),
      createdAt: subDays(today, 60),
    },
    {
      uid: "demo-doc-5",
      role: "doctor",
      name: "Dr. Aisha Patel",
      email: "aisha@mjaconsult.com",
      phone: "+1 555 090 1010",
      active: false,
      specialization: "Psychiatrist",
      qualifications: "MBBS, MRCPsych",
      experienceYears: 10,
      languages: ["English", "Hindi"],
      bio: "Compassionate psychiatrist supporting anxiety, depression and stress with a safe, confidential space.",
      fees: 70,
      currency: "USD",
      rating: 4.85,
      reviewCount: 78,
      availability: avail(days("wednesday", "thursday", "friday", "saturday"), "12:00", "17:00"),
      slotDurationMins: 30,
      timezone: "Asia/Karachi",
      createdAt: subDays(today, 30),
    },
  ];

  const admin: AppUser = {
    uid: "demo-admin",
    role: "admin",
    name: "Platform Admin",
    email: "admin@mjaconsult.com",
    phone: "+1 555 000 0000",
    active: true,
    createdAt: subDays(today, 240),
  };

  const patient: AppUser = {
    uid: "demo-patient",
    role: "patient",
    name: "John Doe",
    email: "patient@mjaconsult.com",
    phone: "+1 555 111 2222",
    active: true,
    createdAt: subDays(today, 45),
  };

  const extraPatients: AppUser[] = [
    { uid: "demo-pt-2", role: "patient", name: "Emily Carter", email: "emily@example.com", phone: "+1 555 222 3333", active: true, createdAt: subDays(today, 20) },
    { uid: "demo-pt-3", role: "patient", name: "Liam Nguyen", email: "liam@example.com", phone: "+1 555 333 4444", active: true, createdAt: subDays(today, 10) },
    { uid: "demo-pt-4", role: "patient", name: "Sofia Rossi", email: "sofia@example.com", phone: "+1 555 444 5555", active: false, createdAt: subDays(today, 5) },
  ];

  const users: AppUser[] = [
    admin,
    patient,
    ...extraPatients,
    ...doctors.map((d) => ({
      uid: d.uid,
      role: "doctor" as const,
      name: d.name,
      email: d.email,
      phone: d.phone,
      active: d.active,
      createdAt: d.createdAt,
    })),
  ];

  const sarah = doctors[0];
  const derm = doctors[1];

  // A consultation happening *right now* so chat + report sharing are usable
  // in the demo without waiting for a slot. Window: 15 min ago → 45 min ahead.
  const hm = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const liveStart = new Date(today.getTime() - 15 * 60_000);
  const liveEnd = new Date(today.getTime() + 45 * 60_000);

  const appointments: Appointment[] = [
    {
      id: "demo-appt-live",
      patientId: patient.uid,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      doctorId: sarah.uid,
      doctorName: sarah.name,
      doctorSpecialization: sarah.specialization,
      date: iso(today),
      slot: { start: hm(liveStart), end: hm(liveEnd) },
      status: "confirmed",
      reason: "Live consultation in progress.",
      fee: 60,
      isFree: false,
      paymentStatus: "verified",
      createdAt: subDays(today, 1),
    },
    {
      id: "demo-appt-1",
      patientId: patient.uid,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      doctorId: sarah.uid,
      doctorName: sarah.name,
      doctorSpecialization: sarah.specialization,
      date: iso(addDays(today, 2)),
      slot: { start: "09:30", end: "10:00" },
      status: "confirmed",
      reason: "Routine heart check-up and BP review.",
      fee: 60,
      isFree: false,
      paymentStatus: "verified",
      meetLink: "https://meet.google.com/demo-abc-defg",
      createdAt: subDays(today, 1),
    },
    {
      id: "demo-appt-2",
      patientId: patient.uid,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      doctorId: derm.uid,
      doctorName: derm.name,
      doctorSpecialization: derm.specialization,
      date: iso(addDays(today, 4)),
      slot: { start: "14:30", end: "15:00" },
      status: "confirmed",
      reason: "Persistent skin rash on arms.",
      fee: 45,
      isFree: false,
      paymentStatus: "proof_submitted",
      paymentProofUrl:
        "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      createdAt: today,
    },
    {
      id: "demo-appt-3",
      patientId: patient.uid,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      doctorId: sarah.uid,
      doctorName: sarah.name,
      doctorSpecialization: sarah.specialization,
      date: iso(subDays(today, 14)),
      slot: { start: "10:00", end: "10:30" },
      status: "completed",
      reason: "Follow-up consultation.",
      fee: 60,
      isFree: false,
      paymentStatus: "verified",
      createdAt: subDays(today, 16),
    },
    {
      id: "demo-appt-4",
      patientId: "demo-pt-2",
      patientName: "Emily Carter",
      patientPhone: "+1 555 222 3333",
      patientEmail: "emily@example.com",
      doctorId: sarah.uid,
      doctorName: sarah.name,
      doctorSpecialization: sarah.specialization,
      date: iso(addDays(today, 1)),
      slot: { start: "11:00", end: "11:30" },
      status: "confirmed",
      reason: "Palpitations in the evening.",
      fee: 0,
      isFree: true,
      paymentStatus: "free",
      createdAt: today,
    },
  ];

  const chatId = `${patient.uid}__${sarah.uid}`;
  const chats: ChatThread[] = [
    {
      id: chatId,
      patientId: patient.uid,
      doctorId: sarah.uid,
      patientName: patient.name,
      doctorName: sarah.name,
      lastMessage: "Thank you, doctor! See you at the appointment.",
      lastSenderId: patient.uid,
      updatedAt: subDays(today, 1),
      unread: { [sarah.uid]: 1, [patient.uid]: 0 },
    },
  ];

  const messages: Record<string, ChatMessage[]> = {
    [chatId]: [
      { id: "m1", senderId: patient.uid, text: "Hello doctor, I've been feeling some chest tightness lately.", createdAt: subDays(today, 2) },
      { id: "m2", senderId: sarah.uid, text: "Hi John, thanks for reaching out. Does it happen during exercise or at rest?", createdAt: subDays(today, 2) },
      { id: "m3", senderId: patient.uid, text: "Mostly when climbing stairs.", createdAt: subDays(today, 1) },
      { id: "m4", senderId: sarah.uid, text: "Understood. Let's review this in our session — I've confirmed your appointment.", createdAt: subDays(today, 1) },
      { id: "m5", senderId: patient.uid, text: "Thank you, doctor! See you at the appointment.", createdAt: subDays(today, 1) },
    ],
  };

  const prescriptions: Prescription[] = [
    {
      id: "demo-appt-3",
      appointmentId: "demo-appt-3",
      doctorId: sarah.uid,
      doctorName: sarah.name,
      doctorSpecialization: sarah.specialization,
      patientId: patient.uid,
      patientName: patient.name,
      patientAge: "54",
      patientSex: "male",
      date: iso(subDays(today, 14)),
      diagnosis: "Stage-1 hypertension with mild exertional dyspnoea.",
      medicines: [
        { name: "Tab. Amlodipine 5mg", dosage: "1 tab", frequency: "Once daily", duration: "30 days" },
        { name: "Tab. Aspirin 75mg", dosage: "1 tab", frequency: "Once daily", duration: "30 days" },
      ],
      advice: "Low-salt diet, walk 30 min daily, monitor BP every morning.",
      followUpDate: iso(addDays(today, 16)),
      doctorStampUrl: sarah.stampUrl,
      companyStampUrl: DEFAULT_COMPANY_STAMP,
      createdAt: subDays(today, 14),
      updatedAt: subDays(today, 14),
    },
  ];

  const promotions: Promotion[] = [
    {
      id: "demo-promo-1",
      type: "promo",
      title: "20% off your first consultation",
      description: "New to MJACONSULT? Get 20% off your very first online consultation with any specialist this month.",
      discountType: "percent",
      discountValue: 20,
      doctorIds: [],
      active: true,
      expiresAt: iso(addDays(today, 21)),
      createdAt: subDays(today, 3),
    },
    {
      id: "demo-promo-2",
      type: "free_campaign",
      title: "Free Heart Health Camp",
      description: "Free cardiology consultations with Dr. Sarah Khan every Friday this month. Book your free slot now!",
      discountType: "free",
      doctorIds: ["demo-doc-1"],
      active: true,
      expiresAt: iso(addDays(today, 28)),
      createdAt: subDays(today, 1),
    },
  ];

  const notifications: AppNotification[] = [
    { id: "n1", userId: patient.uid, title: "Appointment confirmed", body: "Your appointment with Dr. Sarah Khan is confirmed.", type: "appointment", read: false, createdAt: subDays(today, 1) },
    { id: "n2", userId: patient.uid, title: "Payment verified ✅", body: "Your payment for the consultation was verified.", type: "payment", read: true, createdAt: subDays(today, 1) },
    { id: "n3", userId: sarah.uid, title: "New appointment booked", body: "Emily Carter booked a free consultation slot.", type: "appointment", read: false, createdAt: today },
    { id: "n4", userId: sarah.uid, title: "Payment proof submitted", body: "John Doe uploaded payment proof for review.", type: "payment", read: false, createdAt: today },
  ];

  return {
    users,
    doctors,
    appointments,
    promotions,
    prescriptions,
    chats,
    messages,
    notifications,
    passwordOverrides: {},
    paymentSettings: DEFAULT_PAYMENT_SETTINGS,
    siteSettings: DEFAULT_SITE_SETTINGS,
    banners: DEFAULT_BANNERS,
    currentUid: null,
  };
}
