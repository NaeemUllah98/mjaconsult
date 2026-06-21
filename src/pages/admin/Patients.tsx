import { useMemo, useState } from "react";
import { Search, Users, Trash2, Mail, Phone, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { DEMO } from "@/lib/demo/backend";
import { useAsync } from "@/hooks/useAsync";
import { listPatients, deleteUserRecord, resetPatientPassword } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import { formatDate } from "@/utils/format";
import type { AppUser } from "@/types";

export default function AdminPatients() {
  const { data, loading, reload } = useAsync(() => listPatients(), []);
  const [q, setQ] = useState("");
  const [removeTarget, setRemoveTarget] = useState<AppUser | null>(null);
  const [pwTarget, setPwTarget] = useState<AppUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submitPasswordReset() {
    if (!pwTarget) return;
    if (DEMO && newPw.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setPwBusy(true);
    try {
      const channel = await resetPatientPassword(
        pwTarget.email,
        DEMO ? newPw : undefined,
      );
      toast.success(
        channel === "set"
          ? `Password updated for ${pwTarget.name}`
          : `Reset link emailed to ${pwTarget.email}`,
      );
      setPwTarget(null);
      setNewPw("");
    } catch {
      toast.error("Could not reset the password. Please try again.");
    } finally {
      setPwBusy(false);
    }
  }

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.email.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q],
  );

  async function remove() {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await deleteUserRecord(removeTarget.uid);
      toast.success("Patient record removed");
      setRemoveTarget(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="View and manage all registered patient accounts."
      />

      <div className="card mb-6 p-4">
        <Input
          placeholder="Search patients by name or email…"
          icon={<Search className="h-4 w-4" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No patients found"
          description="Registered patients will appear here."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-muted bg-surface-subtle text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Patient</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.uid}
                    className="border-b border-surface-muted last:border-0 transition hover:bg-surface-subtle"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} src={p.photoURL} size="sm" />
                        <span className="font-semibold text-ink">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-ink-muted" /> {p.email}
                      </p>
                      {p.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                          <Phone className="h-3 w-3" /> {p.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {formatDate(p.createdAt ?? null)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={p.active ? "green" : "gray"} dot>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-brand-600 hover:bg-brand-50"
                        onClick={() => {
                          setPwTarget(p);
                          setNewPw("");
                        }}
                      >
                        <KeyRound className="h-4 w-4" /> Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-500 hover:bg-rose-50"
                        onClick={() => setRemoveTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-surface-muted md:hidden">
            {filtered.map((p) => (
              <div key={p.uid} className="flex items-center gap-2 p-4">
                <Avatar name={p.name} src={p.photoURL} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{p.name}</p>
                  <p className="truncate text-xs text-ink-muted">{p.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-brand-600"
                  onClick={() => {
                    setPwTarget(p);
                    setNewPw("");
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-500"
                  onClick={() => setRemoveTarget(p)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={!!pwTarget}
        onClose={() => setPwTarget(null)}
        title="Reset patient password"
        description={
          pwTarget
            ? `For ${pwTarget.name} (${pwTarget.email}).`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPwTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitPasswordReset}
              loading={pwBusy}
              disabled={DEMO && newPw.length < 6}
            >
              {DEMO ? "Set new password" : "Send reset link"}
            </Button>
          </>
        }
      >
        {DEMO ? (
          <div className="space-y-3">
            <Input
              label="New password"
              type="text"
              placeholder="At least 6 characters"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <p className="text-xs text-ink-muted">
              The patient can sign in with this new password immediately.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-subtle p-4 text-sm text-ink-soft">
            We'll email <strong>{pwTarget?.email}</strong> a secure link to
            choose a new password. On the free Firebase plan, passwords are
            changed by the account owner via this reset link rather than set
            directly — this keeps the account secure at zero cost.
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        loading={busy}
        title="Remove patient?"
        message={`This deletes ${removeTarget?.name}'s profile record. Their Firebase Auth login should be removed from the console too.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
