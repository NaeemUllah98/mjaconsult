import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Stethoscope, User, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { DEMO, demoLoginAs } from "@/lib/demo/backend";
import { DEMO_CREDENTIALS } from "@/lib/demo/seed";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/guards";
import { authErrorMessage } from "@/utils/authErrors";

const icons = {
  Admin: <Shield className="h-4 w-4" />,
  Doctor: <Stethoscope className="h-4 w-4" />,
  Patient: <User className="h-4 w-4" />,
};

/**
 * One-tap login buttons shown only in DEMO mode so the platform can be
 * explored as any role without typing credentials.
 */
export function DemoQuickLogin() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  if (!DEMO) return null;

  async function quickLogin(uid: string, role: string) {
    setBusy(uid);
    try {
      const u = demoLoginAs(uid);
      await refreshUser();
      toast.success(`Signed in as ${role}`);
      navigate(homeForRole[u.role]);
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-violet-700">
        <Zap className="h-4 w-4" />
        <span className="text-sm font-bold">Demo mode — explore instantly</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {DEMO_CREDENTIALS.map((c) => (
          <button
            key={c.uid}
            onClick={() => quickLogin(c.uid, c.role)}
            disabled={!!busy}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-2 py-3 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:shadow-soft disabled:opacity-60"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100">
              {icons[c.role as keyof typeof icons]}
            </span>
            {c.role}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-violet-600/80">
        Or sign in manually — e.g. patient@mjaconsult.com / patient123
      </p>
    </div>
  );
}
