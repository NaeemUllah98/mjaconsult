import { useEffect, useState } from "react";
import { Save, Landmark, Megaphone, Star } from "lucide-react";
import toast from "react-hot-toast";
import {
  getPaymentSettings,
  savePaymentSettings,
  getSiteSettings,
  saveSiteSettings,
  listDoctors,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentInfo } from "@/components/shared/PaymentInfo";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Misc";
import { formatCurrency } from "@/utils/format";
import type {
  BankAccount,
  Doctor,
  PaymentSettings,
  SiteSettings,
} from "@/types";

export default function AdminSettings() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPaymentSettings().then(setSettings);
    getSiteSettings().then(setSite);
    listDoctors().then(setDoctors);
  }, []);

  if (!settings || !site) return <PageLoader />;

  const setAccount =
    (key: "pkAccount" | "uaeAccount", field: keyof BankAccount) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setSettings((s) =>
        s ? { ...s, [key]: { ...s[key], [field]: e.target.value } } : s,
      );

  const featured = doctors.find((d) => d.uid === site.featuredDoctorId);

  async function save() {
    if (!settings || !site) return;
    setSaving(true);
    try {
      await Promise.all([savePaymentSettings(settings), saveSiteSettings(site)]);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function accountFields(key: "pkAccount" | "uaeAccount", flag: string, region: string) {
    const acct = settings![key];
    return (
      <Card>
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <h3 className="font-display font-bold text-ink">{region} account</h3>
        </div>
        <div className="mt-4 space-y-4">
          <Input
            label="Bank name"
            value={acct.bank}
            onChange={setAccount(key, "bank")}
            icon={<Landmark className="h-4 w-4" />}
          />
          <Input
            label="Account title"
            value={acct.title}
            onChange={setAccount(key, "title")}
          />
          <Input
            label="Account number / IBAN"
            value={acct.number}
            onChange={setAccount(key, "number")}
          />
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Payment accounts shown on the booking popup, and the doctor promoted on the homepage."
        action={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      {/* Promoted homepage doctor */}
      <Card className="mb-6">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brand-500" />
          <h3 className="font-display font-bold text-ink">
            Promoted doctor (homepage)
          </h3>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          This doctor's real profile is featured in the hero card on the public
          landing page. Leave on “Auto” to show your first active doctor.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
          <Select
            label="Featured doctor"
            value={site.featuredDoctorId ?? ""}
            onChange={(e) =>
              setSite((s) => (s ? { ...s, featuredDoctorId: e.target.value } : s))
            }
          >
            <option value="">Auto (first active doctor)</option>
            {doctors.map((d) => (
              <option key={d.uid} value={d.uid}>
                {d.name} — {d.specialization}
                {d.active ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
          {featured && (
            <div className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white">
                <Star className="h-5 w-5 fill-white" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {featured.name}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {featured.specialization} •{" "}
                  {formatCurrency(featured.fees, featured.currency ?? "USD")}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {accountFields("pkAccount", "🇵🇰", "Pakistan")}
        {accountFields("uaeAccount", "🇦🇪", "UAE")}
      </div>

      <Card className="mt-6">
        <Textarea
          label="Payment instructions (optional)"
          value={settings.instructions ?? ""}
          onChange={(e) =>
            setSettings((s) => (s ? { ...s, instructions: e.target.value } : s))
          }
          placeholder="e.g. Transfer the fee then upload your receipt for verification."
        />
      </Card>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-ink-soft">
          Preview (what patients see)
        </p>
        <Card>
          <PaymentInfo settings={settings} />
        </Card>
      </div>
    </div>
  );
}
