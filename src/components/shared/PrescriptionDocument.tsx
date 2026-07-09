import { createPortal } from "react-dom";
import logo from "@/assets/logo.png";
import { formatDate } from "@/utils/format";
import type { Prescription } from "@/types";

/**
 * The MJACONSULT prescription letterhead, rendered at a fixed 210×150mm
 * (half-A4) aspect ratio. Everything scales with the document's width via
 * container-query units (see the `.rx-*` rules in index.css), so the same
 * markup looks identical in a small preview and on a printed page.
 *
 * The doctor's signature stamp and the universal company seal are taken from
 * the prescription snapshot (both are uploaded & managed by the admin), and
 * sit in the bottom-right exactly like the paper letterhead.
 */
export function PrescriptionDocument({ rx }: { rx: Prescription }) {
  const meds = rx.medicines?.filter((m) => m.name?.trim()) ?? [];

  return (
    <div className="rx-doc">
      <div className="rx-doc-inner">
        {/* Header */}
        <div className="rx-head">
          <img className="rx-head-logo" src={logo} alt="MJACONSULT" />
          <div className="rx-head-brand">
            <div className="rx-head-name">
              MJA<b>CONSULT</b>
            </div>
            <div className="rx-head-sub">Online Health Care</div>
          </div>
        </div>
        <div className="rx-rule" />

        {/* Patient meta */}
        <div className="rx-meta">
          <div className="rx-meta-row">
            <div className="rx-field" style={{ flexBasis: "55%" }}>
              <span className="rx-field-l">Date :</span>
              <span className="rx-field-v">
                {rx.date ? formatDate(rx.date, "MMM d, yyyy") : ""}
              </span>
            </div>
          </div>
          <div className="rx-meta-row">
            <div className="rx-field grow">
              <span className="rx-field-l">Name :</span>
              <span className="rx-field-v">{rx.patientName || ""}</span>
            </div>
            <div className="rx-field" style={{ flexBasis: "22%" }}>
              <span className="rx-field-l">Age :</span>
              <span className="rx-field-v">{rx.patientAge || ""}</span>
            </div>
            <div className="rx-field" style={{ flexBasis: "22%" }}>
              <span className="rx-field-l">Sex :</span>
              <span className="rx-field-v">{sexLabel(rx.patientSex)}</span>
            </div>
          </div>
        </div>

        {/* Body: full-width clinical content with the ℞ mark, then the
            signature block (doctor stamp left, company seal right). */}
        <div className="rx-body">
          <div className="rx-rx-mark">℞</div>

          {rx.diagnosis?.trim() && (
            <div>
              <div className="rx-sec-title">Diagnosis</div>
              <div className="rx-sec-text">{rx.diagnosis}</div>
            </div>
          )}

          <div>
            <div className="rx-sec-title">Medication</div>
            {meds.length > 0 ? (
              <ol className="rx-meds">
                {meds.map((m, i) => (
                  <li className="rx-med" key={i}>
                    <span className="rx-med-no">{i + 1}.</span>
                    <span>
                      <span className="rx-med-name">{m.name}</span>
                      {medDetail(m) && (
                        <span className="rx-med-sub"> — {medDetail(m)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rx-empty">No medication prescribed.</div>
            )}
          </div>

          {rx.advice?.trim() && (
            <div>
              <div className="rx-sec-title">Advice</div>
              <div className="rx-sec-text">{rx.advice}</div>
            </div>
          )}

          {rx.followUpDate && (
            <div>
              <div className="rx-sec-title">Follow-up</div>
              <div className="rx-sec-text">
                {formatDate(rx.followUpDate, "EEEE, MMM d, yyyy")}
              </div>
            </div>
          )}

          {/* Signature block: issuing doctor's stamp (left), company seal
              (right) — kept in separate columns so they never overlap. */}
          <div className="rx-sign">
            <div className="rx-sign-col">
              {rx.doctorStampUrl && (
                <img
                  className="rx-sign-stamp"
                  src={rx.doctorStampUrl}
                  alt={`${rx.doctorName} signature`}
                />
              )}
              <div className="rx-sign-line" />
              <div className="rx-sign-name">{rx.doctorName}</div>
              {rx.doctorSpecialization && (
                <div className="rx-sign-role">{rx.doctorSpecialization}</div>
              )}
            </div>

            {rx.companyStampUrl && (
              <div className="rx-sign-col">
                <img
                  className="rx-seal"
                  src={rx.companyStampUrl}
                  alt="MJACONSULT seal"
                />
                <div className="rx-sign-cap">Authorized Seal</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="rx-foot">
          <div className="rx-foot-line" />
          <div className="rx-foot-row">
            <span>{rx.doctorName}{rx.doctorSpecialization ? ` • ${rx.doctorSpecialization}` : ""}</span>
            <span>MJACONSULT — Online Health Care</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Off-screen copy of the document, portaled directly onto <body>, that serves
 * as the print target. Keeping it out of the (transformed) modal panel ensures
 * `position: fixed` resolves against the page during printing. See the
 * `.rx-print-area` rules in index.css.
 */
export function PrescriptionPrintMount({ rx }: { rx: Prescription }) {
  return createPortal(
    <div className="rx-print-area">
      <PrescriptionDocument rx={rx} />
    </div>,
    document.body,
  );
}

function sexLabel(sex?: string): string {
  if (!sex) return "";
  return sex.charAt(0).toUpperCase() + sex.slice(1);
}

function medDetail(m: { dosage?: string; frequency?: string; duration?: string; notes?: string }): string {
  return [m.dosage, m.frequency, m.duration, m.notes]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");
}
