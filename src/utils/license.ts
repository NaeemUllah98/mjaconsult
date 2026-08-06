import type { Doctor, DoctorLicense } from "@/types";

/** True once a license's expiry date has fully elapsed. */
export function isLicenseExpired(
  license: DoctorLicense,
  now: Date = new Date(),
): boolean {
  if (!license.expiryDate) return false;
  const expiry = new Date(`${license.expiryDate}T23:59:59`);
  return expiry.getTime() < now.getTime();
}

/** True when the doctor has at least one license on file that has expired. */
export function hasExpiredLicense(
  doctor: Pick<Doctor, "licenses"> | null | undefined,
  now: Date = new Date(),
): boolean {
  return (doctor?.licenses ?? []).some((l) => isLicenseExpired(l, now));
}

/**
 * A doctor is shown as "Verified" to patients once the admin has uploaded at
 * least one license and none of them have expired. A doctor with an expired
 * license loses the badge — and is also blocked from logging in (enforced in
 * `AuthContext`) until the admin renews or removes it.
 */
export function isDoctorVerified(
  doctor: Pick<Doctor, "licenses"> | null | undefined,
): boolean {
  const licenses = doctor?.licenses ?? [];
  return licenses.length > 0 && !hasExpiredLicense(doctor);
}
