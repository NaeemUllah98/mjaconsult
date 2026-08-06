import { Link } from "react-router-dom";
import { Star, Briefcase, ArrowRight, ShieldCheck, ShieldQuestion, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/utils/format";
import { isDoctorVerified } from "@/utils/license";
import type { Doctor } from "@/types";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const verified = isDoctorVerified(doctor);
  return (
    <div className="card group flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start gap-4">
        <Avatar name={doctor.name} src={doctor.photoURL} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold text-ink">
            {doctor.name}
          </h3>
          <p className="text-sm font-medium text-brand-600">
            {doctor.specialization}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {doctor.rating?.toFixed(1) ?? "New"}
            </span>
            {doctor.experienceYears ? (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {doctor.experienceYears} yrs
              </span>
            ) : null}
            {doctor.country ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {doctor.country}
              </span>
            ) : null}
          </div>
          <span
            className={`mt-1.5 flex items-center gap-1 text-sm font-bold ${verified ? "text-emerald-600" : "text-ink-muted"}`}
          >
            {verified ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <ShieldQuestion className="h-4 w-4" />
            )}
            {verified ? "Verified" : "Not verified"}
          </span>
        </div>
      </div>

      {doctor.bio && (
        <p className="mt-4 line-clamp-2 text-sm text-ink-muted">{doctor.bio}</p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-surface-muted pt-4">
        <div>
          <p className="text-xs text-ink-muted">Consultation fee</p>
          <p className="font-display text-lg font-bold text-ink">
            {formatCurrency(doctor.fees, doctor.currency ?? "USD")}
          </p>
        </div>
        <Badge tone={doctor.active ? "green" : "gray"} dot>
          {doctor.active ? "Available" : "Unavailable"}
        </Badge>
      </div>

      <Link to={`/patient/doctors/${doctor.uid}`} className="mt-4">
        <Button fullWidth variant="outline" className="group-hover:border-brand-400">
          View profile & book
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </Link>
    </div>
  );
}
