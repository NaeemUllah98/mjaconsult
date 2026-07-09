import { useMemo, useState } from "react";
import { Plus, Trash2, Printer, Save, AlertTriangle, Pill } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import {
  PrescriptionDocument,
  PrescriptionPrintMount,
} from "@/components/shared/PrescriptionDocument";
import { savePrescription } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { writeErrorMessage } from "@/utils/firebaseErrors";
import { printPrescription } from "@/lib/print";
import type { Appointment, Prescription, PrescriptionMedicine } from "@/types";

const emptyMed: PrescriptionMedicine = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  notes: "",
};

/**
 * Doctor-facing prescription editor with a live letterhead preview. Saves to
 * `prescriptions/{appointmentId}` and snapshots the doctor + company stamps so
 * the issued document stays stable. The patient is notified when it's ready.
 */
export function PrescriptionEditor({
  open,
  onClose,
  appointment,
  doctorStampUrl,
  companyStampUrl,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  appointment: Appointment;
  doctorStampUrl?: string;
  companyStampUrl?: string;
  existing: Prescription | null;
  onSaved: (rx: Prescription) => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(existing?.date ?? today);
  const [patientAge, setPatientAge] = useState(existing?.patientAge ?? "");
  const [patientSex, setPatientSex] = useState<string>(existing?.patientSex ?? "");
  const [diagnosis, setDiagnosis] = useState(existing?.diagnosis ?? "");
  const [advice, setAdvice] = useState(existing?.advice ?? "");
  const [followUpDate, setFollowUpDate] = useState(existing?.followUpDate ?? "");
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>(
    existing?.medicines?.length ? existing.medicines : [{ ...emptyMed }],
  );
  const [saving, setSaving] = useState(false);

  const draft = useMemo<Prescription>(
    () => ({
      id: appointment.id,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      doctorSpecialization: appointment.doctorSpecialization,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientAge,
      patientSex: patientSex as Prescription["patientSex"],
      date,
      diagnosis,
      medicines,
      advice,
      followUpDate: followUpDate || undefined,
      doctorStampUrl,
      companyStampUrl,
      createdAt: existing?.createdAt,
    }),
    [
      appointment,
      patientAge,
      patientSex,
      date,
      diagnosis,
      medicines,
      advice,
      followUpDate,
      doctorStampUrl,
      companyStampUrl,
      existing?.createdAt,
    ],
  );

  const setMed = (i: number, key: keyof PrescriptionMedicine, value: string) =>
    setMedicines((list) =>
      list.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)),
    );
  const addMed = () => setMedicines((list) => [...list, { ...emptyMed }]);
  const removeMed = (i: number) =>
    setMedicines((list) =>
      list.length === 1 ? [{ ...emptyMed }] : list.filter((_, idx) => idx !== i),
    );

  async function handleSave() {
    const cleanMeds = medicines.filter((m) => m.name.trim());
    if (!diagnosis.trim() && cleanMeds.length === 0) {
      toast.error("Add a diagnosis or at least one medicine.");
      return;
    }
    setSaving(true);
    try {
      const rx: Prescription = { ...draft, medicines: cleanMeds };
      await savePrescription(rx);
      toast.success(existing ? "Prescription updated" : "Prescription issued");
      onSaved(rx);
      onClose();
      // Notify the patient (in-app + email). Best-effort: a notification
      // failure must never make a saved prescription look like it failed.
      notify({
        userId: appointment.patientId,
        email: appointment.patientEmail,
        name: appointment.patientName,
        title: "Your prescription is ready 📄",
        body: `${appointment.doctorName} has issued your prescription. Open “My Prescriptions” to view or download it.`,
        type: "appointment",
        link: "/patient/prescriptions",
        sendEmailToo: true,
      }).catch(() => {});
    } catch (err) {
      console.error("savePrescription failed", err);
      toast.error(writeErrorMessage(err, "save the prescription"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={existing ? "Edit prescription" : "Write prescription"}
      description={`For ${appointment.patientName} — issued on the MJACONSULT letterhead.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="subtle" onClick={printPrescription}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" /> {existing ? "Save changes" : "Issue prescription"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Form ---- */}
        <div className="space-y-4">
          {!doctorStampUrl && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              No signature stamp is assigned to you yet. You can still issue the
              prescription — ask the admin to upload your stamp so it appears on
              the document.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="col-span-2"
            />
            <Input
              label="Age"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder="e.g. 42"
            />
            <Select
              label="Sex"
              value={patientSex}
              onChange={(e) => setPatientSex(e.target.value)}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <Textarea
            label="Diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Clinical impression / diagnosis"
            className="min-h-[64px]"
          />

          {/* Medicines */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                <Pill className="h-4 w-4 text-brand-400" /> Medication
              </span>
              <Button size="sm" variant="subtle" onClick={addMed}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {medicines.map((m, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-surface-muted bg-surface-subtle p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <input
                      className="input-base h-9 flex-1 py-1.5"
                      value={m.name}
                      onChange={(e) => setMed(i, "name", e.target.value)}
                      placeholder="Medicine name & strength (e.g. Tab. Aspirin 75mg)"
                    />
                    <button
                      type="button"
                      onClick={() => removeMed(i)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-50"
                      aria-label="Remove medicine"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-4">
                    <input
                      className="input-base h-9 py-1.5"
                      value={m.dosage}
                      onChange={(e) => setMed(i, "dosage", e.target.value)}
                      placeholder="Dose"
                    />
                    <input
                      className="input-base h-9 py-1.5"
                      value={m.frequency}
                      onChange={(e) => setMed(i, "frequency", e.target.value)}
                      placeholder="Frequency"
                    />
                    <input
                      className="input-base h-9 py-1.5"
                      value={m.duration}
                      onChange={(e) => setMed(i, "duration", e.target.value)}
                      placeholder="Duration"
                    />
                    <input
                      className="input-base h-9 py-1.5"
                      value={m.notes}
                      onChange={(e) => setMed(i, "notes", e.target.value)}
                      placeholder="Notes"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Textarea
            label="Advice"
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            placeholder="Lifestyle advice, precautions, etc."
            className="min-h-[64px]"
          />

          <Input
            label="Follow-up date (optional)"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>

        {/* ---- Live preview ---- */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <p className="mb-2 text-sm font-semibold text-ink-soft">
            Live preview
          </p>
          <div>
            <PrescriptionDocument rx={draft} />
          </div>
          <PrescriptionPrintMount rx={draft} />
        </div>
      </div>
    </Modal>
  );
}
