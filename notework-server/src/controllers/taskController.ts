import { Response, NextFunction } from "express";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import * as googleCalendar from "../services/googleCalendar.js";

// Default task event duration since tasks only have a due date, not a time range
const TASK_EVENT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Best-effort sync helpers — these never throw. If Calendar isn't connected,
 * or the API call fails for any reason, we log it and move on. Calendar sync
 * should never block or break core task functionality.
 */
async function syncTaskCreateToCalendar(userId: string, task: any) {
  if (!task.dueDate) return;

  try {
    const user = await User.findById(userId);
    if (!user?.calendarIntegrations?.google?.connected) return;

    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + TASK_EVENT_DURATION_MS);

    const event = await googleCalendar.createEvent(user, {
      title: task.title,
      description: task.description || "",
      startTime,
      endTime,
    });

    if (event.id) {
      task.googleEventId = event.id;
      await task.save();
    }
  } catch (err) {
    console.error("Calendar sync (create) failed:", err);
  }
}

async function syncTaskUpdateToCalendar(userId: string, task: any) {
  try {
    const user = await User.findById(userId);
    if (!user?.calendarIntegrations?.google?.connected) return;

    // No due date anymore — remove the calendar event if one exists
    if (!task.dueDate) {
      if (task.googleEventId) {
        await googleCalendar.deleteEvent(user, task.googleEventId);
        task.googleEventId = null;
        await task.save();
      }
      return;
    }

    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + TASK_EVENT_DURATION_MS);

    if (task.googleEventId) {
      // Existing event — update it
      await googleCalendar.updateEvent(user, task.googleEventId, {
        title: task.title,
        description: task.description || "",
        startTime,
        endTime,
      });
    } else {
      // No event yet (e.g., due date was just added) — create one
      const event = await googleCalendar.createEvent(user, {
        title: task.title,
        description: task.description || "",
        startTime,
        endTime,
      });
      if (event.id) {
        task.googleEventId = event.id;
        await task.save();
      }
    }
  } catch (err) {
    console.error("Calendar sync (update) failed:", err);
  }
}

async function syncTaskDeleteToCalendar(
  userId: string,
  googleEventId?: string | null,
) {
  if (!googleEventId) return;

  try {
    const user = await User.findById(userId);
    if (!user?.calendarIntegrations?.google?.connected) return;

    await googleCalendar.deleteEvent(user, googleEventId);
  } catch (err) {
    console.error("Calendar sync (delete) failed:", err);
  }
}

export const createTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { title, description, priority, dueDate, status, linkedMeeting } =
      req.body;

    const task = new Task({
      title,
      description,
      priority: priority || "Medium",
      dueDate: dueDate || null,
      status: status || "Todo",
      linkedMeeting: linkedMeeting || null,
      createdBy: userId,
      assignedUser: userId,
    });

    await task.save();

    // Best-effort — does not block the response
    await syncTaskCreateToCalendar(userId, task);

    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { status, priority, search, linkedMeeting } = req.query;

    const query: any = { createdBy: userId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (linkedMeeting) query.linkedMeeting = linkedMeeting;
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const tasks = await Task.find(query)
      .populate("linkedMeeting", "title")
      .populate("assignedUser", "name email avatar avatarType")
      .sort({ createdAt: -1 });

    return res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, createdBy: userId })
      .populate("linkedMeeting", "title")
      .populate("assignedUser", "name email avatar avatarType");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, description, priority, dueDate, status, linkedMeeting } =
      req.body;

    const task = await Task.findOne({ _id: id, createdBy: userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (status !== undefined) task.status = status;
    if (linkedMeeting !== undefined) task.linkedMeeting = linkedMeeting;

    await task.save();

    // Best-effort — does not block the response
    if (userId) await syncTaskUpdateToCalendar(userId, task);

    const populated = await Task.findById(task._id)
      .populate("linkedMeeting", "title")
      .populate("assignedUser", "name email avatar avatarType");

    return res.json(populated);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const task = await Task.findOneAndDelete({ _id: id, createdBy: userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Best-effort — does not block the response
    if (userId) await syncTaskDeleteToCalendar(userId, task.googleEventId);

    return res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};
