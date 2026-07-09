# MJACONSULT — Go-Live & Fixes Guide

This covers the manual steps that the code changes **cannot** do for you
(they happen in the Firebase / EmailJS / Hostinger dashboards), plus the
deployment steps for Hostinger.

---

## ⭐ STEP 1 — Deploy your Firestore security rules (fixes #1 and #2)

**This is the single most important step.** Right now your live database is
rejecting writes because the security rules in `firestore.rules` were never
deployed — Firebase blocks all writes by default. This is why:

- editing / deleting doesn't show up in Firebase (**#1**), and
- sending a prescription fails with "try again later" (**#2** — the deployed
  rules have no `prescriptions` permission block at all).

The corrected rules are already in `firestore.rules`. Deploy them **one** of
these two ways:

**Option A — command line (fastest):**
```bash
firebase deploy --only firestore:rules --project mjaconsultant-e6687
```
(If it asks you to log in: `firebase login`.)

**Option B — Firebase Console (no CLI):**
1. Open Firebase Console → **Firestore Database** → **Rules** tab.
2. Delete what's there and paste the full contents of `firestore.rules`.
3. Click **Publish**.

✅ After this, prescriptions send, and edits/deletes persist to Firebase.

---

## STEP 2 — Confirm your admin account has the `admin` role (#1)

If admin edits/deletes still fail after Step 1, your admin user document may be
missing its role (e.g. you signed up before `VITE_ADMIN_EMAIL` was set).

1. Firebase Console → **Firestore Database** → `users` collection.
2. Find the document whose `email` is your admin email
   (`VITE_ADMIN_EMAIL` in `.env`).
3. Make sure it has a field **`role`** = **`admin`** (string). Add/fix it if not.

The app now shows a clear error toast when a write is denied, so you'll no
longer get silent failures.

---

## STEP 3 — Enable Google sign-in (#6)

The "Continue with Google" buttons are already built into the app. You just
need to switch the provider on:

1. Firebase Console → **Authentication** → **Sign-in method**.
2. Click **Add new provider** → **Google** → toggle **Enable** → pick a support
   email → **Save**.
3. Still in Authentication → **Settings** → **Authorized domains**, click
   **Add domain** and add your Hostinger domain (e.g. `yourdomain.com`) **and**
   `localhost` (localhost is usually there already).

> Google sign-in popups only work over **https** (Hostinger gives you free SSL —
> see Step 5). Your first Google user becomes a *patient* automatically; the
> account matching `VITE_ADMIN_EMAIL` becomes *admin*.

---

## STEP 4 — Turn on email notifications via EmailJS (#5)

Emails are coded and fan out to the **patient, the doctor, and every admin** on
key events (new booking, payment, cancellation, prescription issued). They are
**not sending yet** because the EmailJS keys in `.env` are empty.

1. Create a free account at <https://www.emailjs.com> (200 emails/month free).
2. **Email Services** → add your email provider (e.g. Gmail) → note the
   **Service ID**.
3. **Email Templates** → create a template. In the template settings:
   - **To email:** `{{to_email}}`
   - **From name:** MJACONSULT
   - **Subject:** `{{subject}}`
   - **Content/body:** include `{{message}}` (and `{{to_name}}` if you like).
   - Note the **Template ID**.
4. **Account → General** → copy your **Public Key**.
5. Put all three into `.env`:
   ```
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_template_id
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   ```
6. **Rebuild** (`npm run build`) and redeploy — Vite bakes env values in at
   build time, so they only take effect after a fresh build.

> The variable names the app sends are exactly: `to_email`, `to_name`,
> `subject`, `message`. Your template must use those.

---

## STEP 5 — Deploy to Hostinger

This is a static site (Vite build), so it runs great on Hostinger shared
hosting — no Node server needed.

1. **Make sure `.env` is filled in** (Firebase + Cloudinary + EmailJS keys).
   Vite embeds these at build time, so an incomplete `.env` = a half-working
   live site (and a missing Firebase config would even drop it into local
   "demo" mode).
2. Build:
   ```bash
   npm run build
   ```
   This produces a **`dist/`** folder (it already includes `.htaccess` for
   routing — see `public/.htaccess`).
3. Upload the **contents of `dist/`** (not the folder itself) into
   **`public_html`** on Hostinger:
   - hPanel → **File Manager** → open `public_html` → **Upload** all files
     from `dist/` (or drag the zip and Extract). Make sure `index.html` and the
     `assets/` folder sit directly inside `public_html`.
   - Be sure the hidden **`.htaccess`** file is uploaded too (enable "show
     hidden files" in File Manager). Without it, page refreshes on routes like
     `/patient/appointments` return 404.
4. **Enable free SSL:** hPanel → **SSL** → install/activate for your domain, and
   turn on **Force HTTPS**. (Required for Google sign-in.)
5. Add your domain to Firebase **Authorized domains** (Step 3.3) if you haven't.

To update the site later: change code → `npm run build` → re-upload `dist/`.

---

## Post-deploy checklist

- [ ] Firestore rules deployed (Step 1) — try editing a doctor; it persists.
- [ ] Issue a prescription — it saves and the patient is notified.
- [ ] Prescription prints as a full **A4 portrait** page (Print → Save as PDF).
- [ ] Google sign-in works on the live https domain.
- [ ] A test booking sends emails to patient + doctor + admin.
- [ ] Hard-refresh a deep link (e.g. `/login`) — no 404 (htaccess working).
