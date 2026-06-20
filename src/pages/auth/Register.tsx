import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { AuthShell } from "./AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "./GoogleButton";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/guards";
import { authErrorMessage } from "@/utils/authErrors";

export default function Register() {
  const { registerPatient } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await registerPatient(
        form.name.trim(),
        form.email.trim(),
        form.phone.trim(),
        form.password,
      );
      toast.success("Account created — welcome!");
      navigate("/patient");
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join MJACONSULT to book consultations in minutes."
      footer={
        <span className="text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full name"
          name="name"
          placeholder="Jane Doe"
          icon={<User className="h-4 w-4" />}
          value={form.name}
          onChange={set("name")}
          required
        />
        <Input
          label="Email address"
          type="email"
          name="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={form.email}
          onChange={set("email")}
          required
        />
        <Input
          label="Phone number"
          name="phone"
          placeholder="+1 555 123 4567"
          icon={<Phone className="h-4 w-4" />}
          value={form.phone}
          onChange={set("phone")}
          hint="Used for appointment reminders."
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="Create a password"
          icon={<Lock className="h-4 w-4" />}
          value={form.password}
          onChange={set("password")}
          required
        />
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create account
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-surface-muted" />
        <span className="text-xs font-medium uppercase text-ink-muted">or</span>
        <span className="h-px flex-1 bg-surface-muted" />
      </div>
      <GoogleButton
        label="Sign up with Google"
        onDone={(u) => navigate(homeForRole[u.role])}
      />

      <p className="mt-5 text-center text-xs text-ink-muted">
        Doctors & admins are added by the clinic. This form creates a patient
        account.
      </p>
    </AuthShell>
  );
}
