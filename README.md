# MJACONSULT — Online Health Care Platform

A complete, modern medical-consultation web app connecting **patients**, **doctors**, and **admins**. Built to run **100% on free tiers**.

Patients book appointments, pay via uploaded proof, chat securely with doctors, and join Google Meet consultations. Doctors manage availability, calendars, payments and video sessions. Admins manage the whole platform and run promotional / free-consultation campaigns.

---

## ✨ Features

| Panel | Capabilities |
|-------|-------------|
| **Patient** | Register/login, browse doctors, view availability calendars, book slots (auto-confirmed), upload payment proof, chat, join Google Meet, view offers, manage profile |
| **Doctor** | Set weekly availability, manage calendar, view appointments, verify payments, generate/share Meet links, chat with patients, edit professional profile & fees |
| **Admin** | Add/edit/activate/deactivate/delete doctors, manage patients, monitor all appointments, broadcast promotions & free campaigns, dashboard analytics |
| **System** | Atomic slot-locking (no double-booking), real-time chat, in-app + email reminders, role-based protected routing |

---

## 🧱 Tech stack (all free)

- **React + Vite + TypeScript**
- **Tailwind CSS** + custom design system + **Framer Motion**
- **Firebase Authentication** (email/password + Google) — *free Spark plan*
- **Cloud Firestore** (database) — *free Spark plan*
- **Cloudinary** (profile pics + payment proofs) — *free, replaces paid Firebase Storage*
- **EmailJS** (email reminders) — *free*
- **Google Calendar API** (auto Google Meet links) — *free*
- **Vercel** (hosting) — *free*

---

## 🚀 Quick start (local)

```bash
npm install
npm run dev
```

### 🧪 Demo mode (no setup required)

If you **don't** add Firebase keys, the app automatically runs in **Demo mode** on a
seeded in-memory backend (persisted to your browser's localStorage). This lets you
explore the entire platform immediately. A purple banner marks demo mode, and the
login page has **one-tap quick-login** buttons for each role.

**Demo accounts:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@mjaconsult.com` | `admin123` |
| Doctor | `doctor@mjaconsult.com` | `doctor123` |
| Patient | `patient@mjaconsult.com` | `patient123` |

It comes preloaded with 5 doctors, sample patients, appointments, a chat thread,
promotions and notifications. Use the banner's **Reset** to restore the original data.

When you're ready to go live, add the real keys below and the app switches to
Firebase automatically.

---

## 🔑 Step-by-step setup (free accounts)

### 1) Firebase — Auth + Database

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. **Build → Authentication → Get started** → enable **Email/Password** and **Google**.
3. **Build → Firestore Database → Create database** → start in **production mode** (we ship rules below).
4. **Project settings (⚙️) → Your apps → Web app (`</>`)** → register → copy the config.
5. Paste the values into `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

6. Deploy the security rules + indexes (recommended):

```bash
npm i -g firebase-tools
firebase login
firebase init firestore     # select your project; accept defaults
firebase deploy --only firestore:rules,firestore:indexes
```

> Or paste `firestore.rules` into **Firestore → Rules** and create the composite indexes from `firestore.indexes.json` manually (the app will also prompt with a "create index" link the first time a query runs).

### 2) Cloudinary — image uploads (replaces Firebase Storage)

1. Create a free account at [cloudinary.com](https://cloudinary.com/).
2. Dashboard → copy your **Cloud name**.
3. **Settings → Upload → Upload presets → Add upload preset** → set **Signing Mode = Unsigned** → save the preset name.
4. Add to `.env`:

```
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

### 3) EmailJS — email reminders *(optional but recommended)*

1. Sign up at [emailjs.com](https://www.emailjs.com/).
2. Add an **email service**, then create a **template** using variables: `to_email`, `to_name`, `subject`, `message`.
3. Copy your **Service ID**, **Template ID**, and **Public Key** into `.env`:

```
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
```

*If you skip this, the app still works — reminders just stay in-app.*

### 4) Google Calendar / Meet — auto video links *(optional)*

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → Library → enable “Google Calendar API”**.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Add **Authorized JavaScript origins**: `http://localhost:5173` and your Vercel URL.
4. Copy the client ID into `.env`:

```
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
```

*If skipped, doctors simply paste a Meet link manually (a “Add Meet link” button is provided).*

### 5) Bootstrap the first Admin

There's no public admin sign-up (by design). To create your admin:

1. Set the admin email in `.env`:
   ```
   VITE_ADMIN_EMAIL=youradmin@example.com
   ```
2. Register normally through the app's **/register** page using that exact email.
   The app automatically assigns the `admin` role to that email on first sign-up.
3. Sign in → you'll land on the **Admin** dashboard. From there, add doctors.

> To promote an existing user instead, open Firestore → `users/{uid}` → set `role` to `admin`.

---

## 👥 How roles are created

- **Patients** self-register at `/register`.
- **Doctors** are created by an **admin** (Admin → Doctors → *Add doctor*). The admin sets a temporary password and shares it; the doctor can reset it later via **Forgot password**.
  - Doctor accounts are created using a *secondary Firebase app instance* so the admin is **never logged out** — no Cloud Functions or paid Admin SDK required.
- **Admin** is bootstrapped via `VITE_ADMIN_EMAIL` (above).

---

## ☁️ Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com/) → **New Project** → import the repo.
3. Framework preset: **Vite** (auto-detected; `vercel.json` is included).
4. Add **all the `VITE_*` environment variables** in **Project → Settings → Environment Variables**.
5. **Deploy.** 🎉
6. Back in Firebase/Google, add your new `*.vercel.app` domain to:
   - Firebase Auth → **Settings → Authorized domains**
   - Google OAuth → **Authorized JavaScript origins** (if using Meet)

---

## 🗂️ Project structure

```
src/
├── assets/            logo
├── components/
│   ├── ui/            design-system primitives (Button, Card, Input, Modal…)
│   ├── layout/        DashboardLayout (sidebar, topbar, notifications)
│   └── shared/        DoctorCard, AppointmentCard, ChatPanel, BookingModal…
├── context/           AuthContext (Firebase auth + role hydration)
├── hooks/             useAsync, useNotifications
├── lib/               firebase, api (Firestore), chat, cloudinary,
│                      notifications (email/in-app/WhatsApp-ready), googleMeet,
│                      adminAccounts (secondary-app doctor creation)
├── pages/
│   ├── public/        Landing
│   ├── auth/          Login, Register, ForgotPassword
│   ├── patient/       Dashboard, BrowseDoctors, DoctorProfile, Appointments, Chat, Promotions, Profile
│   ├── doctor/        Dashboard, Availability, Appointments, Chat, Profile
│   └── admin/         Dashboard, Doctors, Patients, Appointments, Promotions
├── routes/            role-based guards
├── types/             shared TypeScript model
└── utils/             formatting, slots, cn, auth errors
```

---

## 💳 Payment flow (manual verification)

1. Patient books → appointment is **auto-confirmed**, payment marked **unpaid**.
2. Patient uploads a **payment proof** screenshot (Cloudinary) from *My Appointments*.
3. Doctor (or admin) reviews the proof → **Verify** or **Reject**.
4. Patient is notified of the result.

No payment gateway needed = no fees.

---

## 🔔 Notifications & desktop popups

Every panel gets real-time notifications via Cloud Firestore, plus **desktop
popups** when the app is open in a background tab/minimised window:

- **In-app bell** — live unread count + list (all roles).
- **Desktop popups** — when the page is in the background, new notifications and
  new chat messages fire a browser popup (Web Notifications API). When the tab
  is focused, an in-app toast shows instead. Users enable this with the
  "Turn on desktop notifications" banner (asks for browser permission).
- This is **free and needs no backend** — it's driven by the existing Firestore
  listeners.

> Delivering a push to a **fully-closed** browser additionally needs Firebase
> Cloud Messaging (FCM) with a server to send (Cloud Functions = Blaze plan).
> The popup system above covers the common "background tab" case for free; FCM
> can be layered on later for closed-browser delivery.

## 📲 About WhatsApp reminders

The requirements mention WhatsApp reminders. The official WhatsApp Cloud API requires Meta business verification + template approval, so this build ships an **in-app + email** reminder system today, with a **`sendWhatsApp()` stub** in `src/lib/notifications.ts` whose signature is final. When your Meta Business is verified, drop the Graph API call into that one function — no other code changes needed. Until then it returns a `wa.me` deep link staff can use to send manually.

---

## 📜 Available scripts

```bash
npm run dev       # start dev server (http://localhost:5173)
npm run build     # type-check + production build
npm run preview   # preview the production build locally
```

---

## 🔐 Notes on the free tiers

- **Firestore (Spark):** 1 GB stored, 50K reads / 20K writes / 20K deletes per day — plenty for an MVP / small clinic.
- **Cloudinary:** 25 GB storage + 25 GB monthly bandwidth.
- **EmailJS:** ~200 emails/month free.
- Deleting a user from the app removes their Firestore record; remove their **Firebase Auth** login from the console to fully revoke access (the client SDK can't delete other users' auth records for free).

---

Built with care for **MJACONSULT — Online Health Care**. 💙
# mjaconsultant
