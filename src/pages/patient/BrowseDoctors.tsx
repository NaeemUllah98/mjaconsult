import { useMemo, useState } from "react";
import { Search, Stethoscope, SlidersHorizontal } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { listDoctors } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DoctorCard } from "@/components/shared/DoctorCard";
import { Input, Select } from "@/components/ui/Input";
import { PageLoader, EmptyState } from "@/components/ui/Misc";

export default function BrowseDoctors() {
  const { data: doctors, loading } = useAsync(() => listDoctors(true), []);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("");
  const [sort, setSort] = useState("rating");

  const specialties = useMemo(
    () =>
      Array.from(
        new Set((doctors ?? []).map((d) => d.specialization).filter(Boolean)),
      ).sort(),
    [doctors],
  );

  const filtered = useMemo(() => {
    let list = (doctors ?? []).filter((d) => {
      const matchesQ =
        !q ||
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.specialization?.toLowerCase().includes(q.toLowerCase());
      const matchesSpec = !spec || d.specialization === spec;
      return matchesQ && matchesSpec;
    });
    list = [...list].sort((a, b) => {
      if (sort === "fee_low") return a.fees - b.fees;
      if (sort === "fee_high") return b.fees - a.fees;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return list;
  }, [doctors, q, spec, sort]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Find your doctor"
        subtitle="Browse our specialists and book a consultation that fits your schedule."
      />

      {/* Filters */}
      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <Input
          placeholder="Search by name or specialty…"
          icon={<Search className="h-4 w-4" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          className="sm:w-52"
        >
          <option value="">All specialties</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="sm:w-44"
        >
          <option value="rating">Top rated</option>
          <option value="fee_low">Fee: low to high</option>
          <option value="fee_high">Fee: high to low</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="No doctors found"
          description={
            doctors?.length
              ? "Try adjusting your search or filters."
              : "Doctors added by the admin will appear here."
          }
        />
      ) : (
        <>
          <p className="mb-4 flex items-center gap-2 text-sm text-ink-muted">
            <SlidersHorizontal className="h-4 w-4" />
            {filtered.length} doctor{filtered.length !== 1 && "s"} available
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => (
              <DoctorCard key={d.uid} doctor={d} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
