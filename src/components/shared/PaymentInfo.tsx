import { useState } from "react";
import { Landmark, Copy, Check } from "lucide-react";
import { cn } from "@/utils/cn";
import type { BankAccount, PaymentSettings } from "@/types";

function AccountCard({
  flag,
  region,
  account,
}: {
  flag: string;
  region: string;
  account: BankAccount;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(account.number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-surface-muted bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{flag}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {region}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <p className="flex items-center gap-1.5 font-semibold text-ink">
          <Landmark className="h-4 w-4 text-brand-500" />
          {account.bank || "—"}
        </p>
        <p className="text-ink-soft">
          <span className="text-ink-muted">Title:</span> {account.title || "—"}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="break-all font-mono text-ink">{account.number || "—"}</p>
          {account.number && (
            <button
              type="button"
              onClick={copy}
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
                copied
                  ? "text-emerald-600"
                  : "text-ink-muted hover:bg-surface-muted",
              )}
              title="Copy account number"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PaymentInfo({ settings }: { settings: PaymentSettings }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <AccountCard flag="🇵🇰" region="Pakistan" account={settings.pkAccount} />
        <AccountCard flag="🇦🇪" region="UAE" account={settings.uaeAccount} />
      </div>
      {settings.instructions && (
        <p className="text-xs text-ink-muted">{settings.instructions}</p>
      )}
    </div>
  );
}
