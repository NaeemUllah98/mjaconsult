import { Lock, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getDoctor } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Misc";
import { formatDate } from "@/utils/format";
import { isLicenseExpired, isDoctorVerified } from "@/utils/license";
import type { Doctor } from "@/types";

/**
 * Doctors can VIEW their professional profile but cannot edit it — all details
 * (name, specialization, fees, photo, stamp, etc.) are managed by the admin.
 */
export default function DoctorProfileView() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => getDoctor(user!.uid), [user?.uid]);
  if (loading) return <PageLoader />;
  return <View doctor={data} email={user!.email} />;
}

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-0.5 font-medium text-ink">
        {value === undefined || value === "" || value === null ? "—" : value}
      </p>
    </div>
  );
}

function View({ doctor, email }: { doctor: Doctor | null; email: string }) {
  const licenses = doctor?.licenses ?? [];
  const anyExpired = licenses.some((l) => isLicenseExpired(l));
  const verified = isDoctorVerified(doctor);

  return (
    <div>
      <PageHeader
        title="My professional profile"
        subtitle="This is what patients see. Your details are managed by the admin."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Your profile is read-only. To change your name, specialization, fee or
          any other detail, please contact the MJACONSULT admin.
        </p>
      </div>

      {anyExpired && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            One of your licenses has expired. Your next login will be blocked
            until the admin renews or removes it — please contact them.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center">
          <Avatar src={doctor?.photoURL} name={doctor?.name} size="xl" />
          <p className="mt-4 font-display font-bold text-ink">
            {doctor?.name || "Your name"}
          </p>
          <p className="text-sm text-brand-600">
            {doctor?.specialization || "Specialization"}
          </p>
          <div className="mt-4 w-full rounded-xl bg-brand-gradient-soft p-3">
            <p className="text-xs text-ink-muted">Consultation fee</p>
            <p className="font-display text-xl font-extrabold text-brand-900">
              {doctor?.currency ?? "USD"} {doctor?.fees ?? 0}
            </p>
          </div>

          <div className="mt-4 w-full rounded-xl border border-surface-muted p-3">
            <p className="mb-2 text-xs font-medium text-ink-muted">
              Signature stamp (on your prescriptions)
            </p>
            {doctor?.stampUrl ? (
              <img
                src={doctor.stampUrl}
                alt="Your signature stamp"
                className="mx-auto max-h-16 object-contain"
              />
            ) : (
              <p className="text-[11px] text-ink-muted">
                Not assigned yet — ask the admin to upload your stamp so it
                appears on prescriptions you issue.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-5 lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={doctor?.name} />
            <Field label="Email" value={email} />
            <Field label="Phone" value={doctor?.phone} />
            <Field label="Specialization" value={doctor?.specialization} />
            <Field label="Experience (years)" value={doctor?.experienceYears} />
            <Field label="Qualifications" value={doctor?.qualifications} />
            <Field label="Country / location" value={doctor?.country} />
            <Field
              label="Languages"
              value={(doctor?.languages ?? []).join(", ")}
            />
            <Field
              label="Consultation fee"
              value={`${doctor?.currency ?? "USD"} ${doctor?.fees ?? 0}`}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-ink-muted">About you</p>
            <p className="mt-0.5 whitespace-pre-line text-ink">
              {doctor?.bio || "—"}
            </p>
          </div>
        </Card>

        <Card className="space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-brand-600">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-display font-bold text-ink">
                Medical licenses
              </h3>
            </div>
            <span
              className={`flex items-center gap-1 text-sm font-bold ${verified ? "text-emerald-600" : "text-ink-muted"}`}
            >
              {verified ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldQuestion className="h-4 w-4" />
              )}
              {verified ? "Verified" : "Not verified"}
            </span>
          </div>
          {licenses.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <ShieldQuestion className="h-4 w-4" />
              No license on file yet — ask the admin to upload one to earn the
              "Verified" badge patients see.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {licenses.map((l) => {
                const expired = isLicenseExpired(l);
                return (
                  <div
                    key={l.id}
                    className="rounded-xl border border-surface-muted p-3"
                  >
                    <p className="text-sm font-semibold text-ink">{l.title}</p>
                    {l.licenseNumber && (
                      <p className="text-xs text-ink-muted">#{l.licenseNumber}</p>
                    )}
                    <div className="mt-2">
                      <Badge tone={expired ? "red" : "green"}>
                        {expired ? "Expired" : "Valid until"} {formatDate(l.expiryDate)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
