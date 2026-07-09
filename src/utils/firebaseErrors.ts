/**
 * Map Firestore/Firebase write failures to friendly, *actionable* messages.
 *
 * The most common cause of a silently-failing edit/delete is that the
 * security rules haven't been deployed (Firebase locks all writes by default),
 * or the signed-in admin's user document doesn't carry `role: "admin"`. We
 * surface that explicitly instead of a generic "try again".
 */
export function writeErrorMessage(err: unknown, action = "save your changes"): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "permission-denied":
      return `Permission denied — couldn't ${action}. Deploy your Firestore rules and confirm your account has the admin role.`;
    case "unavailable":
    case "deadline-exceeded":
      return "Network problem reaching the database. Check your connection and try again.";
    case "unauthenticated":
      return "Your session expired. Please sign in again.";
    case "not-found":
      return "That record no longer exists — it may have already been removed.";
    default:
      return (err as Error)?.message || `Could not ${action}. Please try again.`;
  }
}
