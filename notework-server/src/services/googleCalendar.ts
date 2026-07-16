import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { encryptToken, decryptToken } from "../utils/tokenEncryption.js";
import { User, IUser } from "../models/User.js";
import { env } from "../config/env.js";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

interface EventInput {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
}

interface EventUpdateInput {
  title?: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
}

function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(userId: string): string {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: userId,
  });
}

export async function getTokensFromCode(code: string): Promise<Credentials> {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getAuthenticatedClient(
  user: IUser,
): Promise<OAuth2Client> {
  const googleIntegration = user.calendarIntegrations?.google;
  if (!googleIntegration?.connected) {
    throw new Error("Google Calendar is not connected for this user");
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: decryptToken(googleIntegration.accessToken) ?? undefined,
    refresh_token: decryptToken(googleIntegration.refreshToken) ?? undefined,
    expiry_date: googleIntegration.tokenExpiry
      ? new Date(googleIntegration.tokenExpiry).getTime()
      : undefined,
  });

  oauth2Client.on("tokens", async (newTokens: Credentials) => {
    const update: Record<string, unknown> = {};

    if (newTokens.access_token) {
      update["calendarIntegrations.google.accessToken"] = encryptToken(
        newTokens.access_token,
      );
    }
    if (newTokens.refresh_token) {
      update["calendarIntegrations.google.refreshToken"] = encryptToken(
        newTokens.refresh_token,
      );
    }
    if (newTokens.expiry_date) {
      update["calendarIntegrations.google.tokenExpiry"] = new Date(
        newTokens.expiry_date,
      );
    }

    if (Object.keys(update).length > 0) {
      await User.findByIdAndUpdate(user._id, { $set: update });
    }
  });

  return oauth2Client;
}

export async function createEvent(
  user: IUser,
  { title, description, startTime, endTime }: EventInput,
) {
  const auth = await getAuthenticatedClient(user);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: title,
      description: description || "",
      start: { dateTime: new Date(startTime).toISOString() },
      end: { dateTime: new Date(endTime).toISOString() },
    },
  });

  return res.data;
}

export async function updateEvent(
  user: IUser,
  externalEventId: string,
  { title, description, startTime, endTime }: EventUpdateInput,
) {
  const auth = await getAuthenticatedClient(user);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId: externalEventId,
    requestBody: {
      summary: title,
      description: description || "",
      start: startTime
        ? { dateTime: new Date(startTime).toISOString() }
        : undefined,
      end: endTime ? { dateTime: new Date(endTime).toISOString() } : undefined,
    },
  });

  return res.data;
}

export async function deleteEvent(
  user: IUser,
  externalEventId: string,
): Promise<void> {
  const auth = await getAuthenticatedClient(user);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId: externalEventId,
  });
}
export interface CalendarChange {
  id: string;
  status: string; // 'confirmed' | 'cancelled' | ...
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export interface SyncResult {
  changes: CalendarChange[];
  nextSyncToken?: string;
  fullResyncRequired?: boolean; // true if Google invalidated our old syncToken
}

/**
 * Fetches events changed since the last sync (using an incremental syncToken).
 * If no syncToken exists yet (first-ever sync for this user), does a full
 * initial fetch and returns a syncToken to store for next time.
 */
export async function listChangedEvents(
  user: IUser,
  syncToken?: string | null,
): Promise<SyncResult> {
  const auth = await getAuthenticatedClient(user);
  const calendar = google.calendar({ version: "v3", auth });

  const allChanges: CalendarChange[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  try {
    do {
      const res = await calendar.events.list({
        calendarId: "primary",
        syncToken: syncToken || undefined,
        pageToken,
        singleEvents: true,
        showDeleted: true, // required to receive cancelled/deleted events
      });

      allChanges.push(...((res.data.items || []) as CalendarChange[]));
      pageToken = res.data.nextPageToken || undefined;
      nextSyncToken = res.data.nextSyncToken || undefined;
    } while (pageToken);

    return { changes: allChanges, nextSyncToken };
  } catch (err: any) {
    if (err.code === 410 || err.response?.status === 410) {
      return { changes: [], fullResyncRequired: true };
    }
    throw err;
  }
}
