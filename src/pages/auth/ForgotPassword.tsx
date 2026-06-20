import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, MailCheck } from "lucide-react";
import toast from "react-hot-toast";
import { AuthShell } from "./AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage } from "@/utils/authErrors";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-3 font-display font-bold text-ink">Check your inbox</h3>
          <p className="mt-1 text-sm text-ink-muted">
            If an account exists for <strong>{email}</strong>, a reset link is on
            its way.
          </p>
        </div>
      ) : (
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
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
