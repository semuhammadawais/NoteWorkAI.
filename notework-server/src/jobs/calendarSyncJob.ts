import cron from "node-cron";
import { User } from "../models/User.js";
import { Task } from "../models/Task.js";
import * as googleCalendar from "../services/googleCalendar.js";

/**
 * Pulls incoming changes from Google Calendar for a single user and
 * applies them to any MeetMind Task that's linked via googleEventId.
 *
 * Scope (narrow, by design): we only react to events we created ourselves.
 * Unrelated calendar events are ignored entirely — we never create new
 * Tasks from arbitrary calendar events in this phase.
 */
async function syncUserCalendar(user: any) {
  const google_ = user.calendarIntegrations?.google;
  if (!google_?.connected) return;

  let result = await googleCalendar.listChangedEvents(user, google_.syncToken);

  // If Google invalidated our syncToken, do one full resync to get a fresh token.
  if (result.fullResyncRequired) {
    console.log(
      `[calendarSync] syncToken expired for user ${user._id}, doing full resync`,
    );
    result = await googleCalendar.listChangedEvents(user, null);
  }

  for (const event of result.changes) {
    // Only act on events MeetMind itself created and linked to a Task
    const task = await Task.findOne({
      googleEventId: event.id,
      createdBy: user._id,
    });
    if (!task) continue; // not one of ours — ignore (narrow scope)

    if (event.status === "cancelled") {
      // Event was deleted on Google Calendar's side — unlink, don't delete the Task
      task.googleEventId = null;
      await task.save();
      console.log(
        `[calendarSync] unlinked task ${task._id} (event deleted on Google)`,
      );
      continue;
    }

    // Event still exists — check if its time changed
    const newStart = event.start?.dateTime || event.start?.date;
    if (newStart) {
      const newDueDate = new Date(newStart);
      const currentDueDate = task.dueDate ? new Date(task.dueDate) : null;

      if (
        !currentDueDate ||
        currentDueDate.getTime() !== newDueDate.getTime()
      ) {
        task.dueDate = newDueDate;
        await task.save();
        console.log(
          `[calendarSync] updated task ${task._id} dueDate from Google Calendar edit`,
        );
      }
    }
  }

  // Persist the new syncToken for next run
  if (result.nextSyncToken) {
    await User.findByIdAndUpdate(user._id, {
      $set: { "calendarIntegrations.google.syncToken": result.nextSyncToken },
    });
  }
}

async function runCalendarSync() {
  const connectedUsers = await User.find({
    "calendarIntegrations.google.connected": true,
  });

  for (const user of connectedUsers) {
    try {
      await syncUserCalendar(user);
    } catch (err) {
      console.error(`[calendarSync] failed for user ${user._id}:`, err);
      // Continue to next user — one user's failure shouldn't block others
    }
  }
}

/**
 * Starts the recurring calendar sync job.
 * Runs every 5 minutes.
 */
export function startCalendarSyncJob() {
  cron.schedule("*/1 * * * *", () => {
    console.log("[calendarSync] running scheduled sync...");
    runCalendarSync().catch((err) =>
      console.error("[calendarSync] unexpected job error:", err),
    );
  });

  console.log("[calendarSync] job scheduled (every 5 minutes)");
}
