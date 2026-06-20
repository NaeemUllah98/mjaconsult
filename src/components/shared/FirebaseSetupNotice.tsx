import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { Database, KeyRound, Cloud, Mail } from "lucide-react";

const steps = [
  {
    icon: <KeyRound className="h-5 w-5" />,
    title: "Create a Firebase project",
    body: "Go to console.firebase.google.com, create a project, then add a Web app. Copy the config keys into a .env file.",
  },
  {
    icon: <Database className="h-5 w-5" />,
    title: "Enable Auth + Firestore",
    body: "Turn on Email/Password (and Google) sign-in, then create a Cloud Firestore database in test mode to start.",
  },
  {
    icon: <Cloud className="h-5 w-5" />,
    title: "Add Cloudinary (free)",
    body: "Create an unsigned upload preset and add the cloud name + preset to .env for profile pictures and payment proofs.",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Optional: EmailJS + Google",
    body: "Add EmailJS keys for email reminders and a Google OAuth client id for auto-generated Meet links.",
  },
];

export function FirebaseSetupNotice() {
  return (
    <div className="min-h-screen bg-brand-gradient-soft">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-12">
        <Logo className="h-14 w-14" textClassName="text-2xl" />
        <h1 className="mt-8 text-center font-display text-3xl font-extrabold text-brand-900">
          Welcome to MJACONSULT 👋
        </h1>
        <p className="mt-2 max-w-xl text-center text-ink-soft">
          Your app is built and ready. Add your free API keys to a{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm text-brand-700">
            .env
          </code>{" "}
          file (copy <code className="text-brand-700">.env.example</code>) and
          restart the dev server to launch.
        </p>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          {steps.map((s, i) => (
            <Card key={i} className="flex gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
                {s.icon}
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-ink">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-1 text-sm text-ink-muted">{s.body}</p>
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-sm text-ink-muted">
          Full instructions are in{" "}
          <code className="text-brand-700">README.md</code>.
        </p>
      </div>
    </div>
  );
}
