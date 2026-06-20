/**
 * Google Meet link generation via the Google Calendar API.
 *
 * Approach (free): we use Google Identity Services (GIS) token flow in the
 * browser to get an OAuth access token with the calendar.events scope, then
 * create a Calendar event with `conferenceData` so Google mints a real Meet
 * link. The doctor authorises once; the token is used to create the event.
 *
 * Setup:
 *  1. Google Cloud Console > enable "Google Calendar API".
 *  2. Create an OAuth Client ID (Web). Add your dev + prod origins.
 *  3. Put the client id in VITE_GOOGLE_CLIENT_ID.
 *
 * If Google is not configured, generateMeetLink() throws a friendly error so
 * the UI can fall back to letting the doctor paste a link manually.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

export const isGoogleConfigured = Boolean(CLIENT_ID);

declare global {
  interface Window {
    google?: any;
  }
}

let gisLoaded = false;

function loadGis(): Promise<void> {
  if (gisLoaded && window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("gis-script");
    if (existing) {
      existing.addEventListener("load", () => {
        gisLoaded = true;
        resolve();
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.id = "gis-script";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Identity"));
    document.head.appendChild(script);
  });
}

function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export interface MeetEventInput {
  summary: string;
  description?: string;
  /** ISO datetime, e.g. 2026-06-20T09:00:00 */
  startISO: string;
  endISO: string;
  attendees?: string[];
}

/**
 * Create a Google Calendar event with a Meet link and return the join URL.
 * Requires the signed-in (doctor) Google account to authorise once.
 */
export async function generateMeetLink(input: MeetEventInput): Promise<string> {
  if (!isGoogleConfigured) {
    throw new Error(
      "Google Calendar is not configured. Paste a Meet link manually, or add VITE_GOOGLE_CLIENT_ID.",
    );
  }
  await loadGis();
  const token = await requestAccessToken();

  const event = {
    summary: input.summary,
    description: input.description ?? "",
    start: { dateTime: input.startISO },
    end: { dateTime: input.endISO },
    attendees: (input.attendees ?? []).map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `mja-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!res.ok) {
    throw new Error("Could not create the Google Meet link. Try again.");
  }
  const data = await res.json();
  const meet =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find(
      (e: any) => e.entryPointType === "video",
    )?.uri;
  if (!meet) throw new Error("No Meet link was returned by Google.");
  return meet as string;
}
