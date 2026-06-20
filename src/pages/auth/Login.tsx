import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { AuthShell } from "./AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "./GoogleButton";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/guards";
import { authErrorMessage } from "@/utils/authErrors";
import { DemoQuickLogin } from "./DemoQuickLogin";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      toast.success("Welcome back!");
      navigate(homeForRole[u.role]);
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your appointments and consultations."
      footer={
        <span className="text-ink-muted">
          New to MJACONSULT?{" "}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </span>
      }
    >
      <DemoQuickLogin />
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          name="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div>
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mt-1.5 text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Sign in
        </Button>
      </form>

      <Divider />
      <GoogleButton
        label="Continue with Google"
        onDone={(u) => navigate(homeForRole[u.role])}
      />
    </AuthShell>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-surface-muted" />
      <span className="text-xs font-medium uppercase text-ink-muted">or</span>
      <span className="h-px flex-1 bg-surface-muted" />
    </div>
  );
}
