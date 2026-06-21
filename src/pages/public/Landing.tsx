import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Video,
  MessageSquare,
  ShieldCheck,
  Megaphone,
  Clock,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { HeroSlideshow } from "@/components/shared/HeroSlideshow";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/guards";
import { getSiteSettings, getDoctor, listDoctors } from "@/lib/api";
import { WEEKDAYS } from "@/utils/format";
import type { Doctor } from "@/types";

/** Up to 6 upcoming slot times from a doctor's weekly availability. */
function previewSlots(doctor: Doctor | null): string[] {
  if (doctor) {
    const order = [...WEEKDAYS.slice(new Date().getDay()), ...WEEKDAYS];
    for (const wd of order) {
      const slots = doctor.availability?.[wd] ?? [];
      if (slots.length) return slots.slice(0, 6).map((s) => s.start);
    }
  }
  return ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
}

const features = [
  {
    icon: <CalendarCheck className="h-6 w-6" />,
    title: "Smart Appointment Booking",
    body: "Browse doctor calendars and lock a slot in seconds. Booked times instantly become unavailable to everyone else.",
  },
  {
    icon: <Video className="h-6 w-6" />,
    title: "Google Meet Consultations",
    body: "Join secure video consultations with one click — a Meet link is generated automatically for every appointment.",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Private Doctor Chat",
    body: "Message your doctor securely inside the platform. No phone numbers shared, no third-party apps needed.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "Manual Payment Verification",
    body: "Upload your payment proof and get verified by our team — simple, transparent, and secure.",
  },
  {
    icon: <Megaphone className="h-6 w-6" />,
    title: "Offers & Free Campaigns",
    body: "Never miss a promotion or free-consultation campaign announced by the clinic.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Reminders That Help",
    body: "Email and in-app reminders for confirmations, upcoming sessions and payments keep you on track.",
  },
];

const steps = [
  { n: "01", title: "Create your account", body: "Register securely in under a minute with email or Google." },
  { n: "02", title: "Find the right doctor", body: "Filter by specialization, fees and availability." },
  { n: "03", title: "Book & pay", body: "Pick a slot, upload payment proof, get instant confirmation." },
  { n: "04", title: "Consult online", body: "Join your Google Meet session and chat anytime." },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function Landing() {
  const { user } = useAuth();
  const dashHref = user ? homeForRole[user.role] : "/register";

  // The doctor promoted on the homepage (admin-chosen, else first active).
  const [featured, setFeatured] = useState<Doctor | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const site = await getSiteSettings();
        let doc: Doctor | null = site.featuredDoctorId
          ? await getDoctor(site.featuredDoctorId)
          : null;
        if (!doc) {
          const docs = await listDoctors(true);
          doc = docs[0] ?? null;
        }
        if (alive) setFeatured(doc);
      } catch {
        /* keep the static fallback card */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const heroName = featured?.name ?? "Dr. Sarah Khan";
  const heroSpec = featured?.specialization ?? "Cardiologist";
  const heroRating = (featured?.rating ?? 4.9).toFixed(1);
  const heroSlots = previewSlots(featured);

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-surface-muted/60 bg-surface/80 backdrop-blur-xl">
        <div className="section-pad mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
            <a href="#features" className="transition hover:text-brand-600">Features</a>
            <a href="#how" className="transition hover:text-brand-600">How it works</a>
            <a href="#roles" className="transition hover:text-brand-600">For everyone</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={dashHref}>
                <Button size="sm">Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Banner slideshow */}
      <HeroSlideshow />

      {/* Hero */}
      <section className="relative bg-hero-glow">
        <div className="section-pad mx-auto grid max-w-7xl items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <motion.div initial="hidden" animate="show" variants={fade}>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
              <HeartPulse className="h-4 w-4" /> Online Health Care, simplified
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-brand-900 sm:text-5xl lg:text-6xl text-balance">
              Consult trusted doctors,{" "}
              <span className="gradient-text">anytime, anywhere.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft">
              MJACONSULT connects you with qualified doctors for online
              consultations, secure chat and easy appointment booking — all in
              one beautiful place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={dashHref}>
                <Button size="lg">
                  {user ? "Open dashboard" : "Book your first consult"}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">I'm a doctor / admin</Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-ink-muted">
              {["No app download", "Secure & private", "Free to start"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-500" /> {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient opacity-10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-surface-muted bg-surface p-6 shadow-card">
                <div className="flex items-center gap-3 border-b border-surface-muted pb-4">
                  {featured?.photoURL ? (
                    <img
                      src={featured.photoURL}
                      alt={heroName}
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white">
                      <Stethoscope className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold text-ink">
                      {heroName}
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      {heroSpec} • ⭐ {heroRating}
                    </p>
                  </div>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Available
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {heroSlots.map((t, i) => (
                    <div
                      key={`${t}-${i}`}
                      className={`rounded-xl border px-2 py-2.5 text-center text-sm font-medium ${
                        i === 2
                          ? "border-brand-400 bg-brand-gradient text-white shadow-glow"
                          : "border-surface-muted text-ink-soft"
                      }`}
                    >
                      {t}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-brand-700">
                    <Video className="h-5 w-5" />
                    <span className="text-sm font-semibold">Google Meet ready</span>
                  </div>
                  <Link to={dashHref}>
                    <Button size="sm">Confirm</Button>
                  </Link>
                </div>
              </div>

              {/* Floating chip */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute -left-6 bottom-10 hidden rounded-2xl border border-surface-muted bg-surface p-3 shadow-card sm:block"
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-500 text-white">
                    <Star className="h-4 w-4 fill-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{heroRating} / 5</p>
                    <p className="text-xs text-ink-muted">Patient rating</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-surface-muted bg-surface-subtle">
        <div className="section-pad mx-auto grid max-w-7xl grid-cols-2 gap-6 py-8 sm:grid-cols-4">
          {[
            ["100%", "Online consultations"],
            ["24/7", "Secure messaging"],
            ["1-click", "Google Meet join"],
            ["Free", "To get started"],
          ].map(([k, v]) => (
            <div key={v} className="text-center">
              <p className="font-display text-3xl font-extrabold gradient-text">{k}</p>
              <p className="mt-1 text-sm text-ink-muted">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section-pad mx-auto max-w-7xl py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-teal-500">
            Everything you need
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-brand-900 sm:text-4xl text-balance">
            A complete care platform, beautifully designed
          </h2>
          <p className="mt-4 text-ink-soft">
            From booking to consultation to follow-up — every step is fast,
            secure and delightfully simple.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fade}
              className="card group p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-soft transition-transform group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-brand-gradient-soft">
        <div className="section-pad mx-auto max-w-7xl py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-teal-600">
              How it works
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-brand-900 sm:text-4xl">
              Care in four simple steps
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fade}
                className="relative rounded-2xl bg-surface p-6 shadow-soft"
              >
                <span className="font-display text-4xl font-extrabold text-brand-100">
                  {s.n}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-ink">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink-muted">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="section-pad mx-auto max-w-7xl py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              tag: "For Patients",
              title: "Your health, in your pocket",
              points: ["Book & manage appointments", "Chat with your doctor", "Join Meet sessions", "Track payments & offers"],
              cta: "Join as patient",
              href: "/register",
            },
            {
              tag: "For Doctors",
              title: "Run your practice online",
              points: ["Set your availability", "Manage your calendar", "Message patients securely", "Host video consultations"],
              cta: "Sign in as doctor",
              href: "/login",
              featured: true,
            },
            {
              tag: "For Admins",
              title: "Full control, zero hassle",
              points: ["Manage doctors & patients", "Monitor all appointments", "Run promo campaigns", "Verify payments"],
              cta: "Admin sign in",
              href: "/login",
            },
          ].map((r) => (
            <div
              key={r.tag}
              className={`relative overflow-hidden rounded-3xl p-8 ${
                r.featured
                  ? "bg-brand-gradient text-white shadow-card"
                  : "border border-surface-muted bg-surface"
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  r.featured ? "text-teal-200" : "text-teal-500"
                }`}
              >
                {r.tag}
              </span>
              <h3
                className={`mt-2 font-display text-2xl font-extrabold ${
                  r.featured ? "text-white" : "text-brand-900"
                }`}
              >
                {r.title}
              </h3>
              <ul className="mt-6 space-y-3">
                {r.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2
                      className={`h-5 w-5 shrink-0 ${
                        r.featured ? "text-teal-200" : "text-teal-500"
                      }`}
                    />
                    <span className={r.featured ? "text-brand-50" : "text-ink-soft"}>
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
              <Link to={r.href} className="mt-8 block">
                <Button
                  variant={r.featured ? "secondary" : "outline"}
                  fullWidth
                  className={r.featured ? "bg-white text-brand-700 hover:bg-brand-50" : ""}
                >
                  {r.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad mx-auto max-w-7xl pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-8 py-14 text-center shadow-card">
          <div className="absolute inset-0 bg-hero-glow opacity-50" />
          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl text-balance">
              Ready to take control of your health?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-50">
              Join MJACONSULT today and book your first online consultation in
              minutes.
            </p>
            <Link to={dashHref} className="mt-8 inline-block">
              <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
                Get started — it's free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-muted bg-surface-subtle">
        <div className="section-pad mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-ink-muted">
            © {new Date().getFullYear()} MJACONSULT — Online Health Care. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
