import { Router, Request, Response } from "express";
import { google } from "googleapis";
import { protect, AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { User } from "../models/User.js";
import * as googleCalendar from "../services/googleCalendar.js";
import { encryptToken } from "../utils/tokenEncryption.js";
import { env } from "../config/env.js";

const router = Router();

router.get(
  "/google/connect",
  protect,
  (req: AuthenticatedRequest, res: Response) => {
    const authUrl = googleCalendar.getAuthUrl(req.user!.id);
    res.redirect(authUrl);
  },
);

router.get("/google/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const userId = req.query.state as string;

  try {
    const tokens = await googleCalendar.getTokensFromCode(code);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    await User.findByIdAndUpdate(userId, {
      $set: {
        "calendarIntegrations.google": {
          connected: true,
          accessToken: encryptToken(tokens.access_token),
          refreshToken: encryptToken(tokens.refresh_token),
          tokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
          connectedAt: new Date(),
          googleEmail: profile.email ?? undefined,
        },
      },
    });

    res.redirect(`${env.CLIENT_URL}/settings?calendar=connected`);
  } catch (err) {
    console.error("Google Calendar OAuth error:", err);
    res.redirect(`${env.CLIENT_URL}/settings?calendar=error`);
  }
});

router.get(
  "/google/status",
  protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.user!.id);
    const googleIntegration = user?.calendarIntegrations?.google;

    res.json({
      connected: !!googleIntegration?.connected,
      email: googleIntegration?.googleEmail ?? null,
      connectedAt: googleIntegration?.connectedAt ?? null,
    });
  },
);

router.post(
  "/google/disconnect",
  protect,
  async (req: AuthenticatedRequest, res: Response) => {
    await User.findByIdAndUpdate(req.user!.id, {
      $unset: { "calendarIntegrations.google": "" },
    });
    res.json({ message: "Google Calendar disconnected successfully" });
  },
);

export default router;
