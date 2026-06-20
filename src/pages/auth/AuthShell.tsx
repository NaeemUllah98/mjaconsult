import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Video, CalendarCheck, Quote } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <h1 className="font-display text-3xl font-extrabold text-brand-900">
              {title}
            </h1>
            <p className="mt-2 text-ink-soft">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
          </motion.div>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:block">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="ml-auto max-w-sm">
            <Quote className="h-10 w-10 text-teal-200/70" />
            <p className="mt-4 font-display text-2xl font-bold leading-snug text-balance">
              "The easiest way I've found to consult a doctor online — booking
              took less than a minute."
            </p>
            <p className="mt-4 text-brand-100">— A happy MJACONSULT patient</p>
          </div>

          <div className="space-y-4">
            {[
              { icon: <CalendarCheck className="h-5 w-5" />, t: "Instant appointment booking" },
              { icon: <Video className="h-5 w-5" />, t: "1-click Google Meet consultations" },
              { icon: <ShieldCheck className="h-5 w-5" />, t: "Private & secure by design" },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  {x.icon}
                </span>
                <span className="font-medium text-brand-50">{x.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
