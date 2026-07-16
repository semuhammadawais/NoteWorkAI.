import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useStore } from "../store/useStore";
import { Modal } from "../components/Modal";
import { Skeleton } from "../components/Skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  Link as LinkIcon,
  Trash2,
  Calendar,
  CalendarX,
  Loader2,
  CheckSquare,
  AlertCircle,
} from "lucide-react";
import type { Task, TaskStatus, Meeting } from "../types";
import { AnimatePresence, motion } from "framer-motion";
import { ConfirmModal } from "../components/ConfirmModal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]),
  status: z.enum(["Todo", "In Progress", "Completed"]),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  linkedMeeting: z.string().optional().nullable().or(z.literal("")),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const isOverdue = (dueDate?: string | null, status?: TaskStatus) => {
  if (!dueDate || status === "Completed") return false;
  return new Date(dueDate).setHours(23, 59, 59) < Date.now();
};

export const TaskBoard: React.FC = () => {
  const queryClient = useQueryClient();
  const { taskFilters, setTaskFilters, addToast } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<TaskStatus | null>(
    null,
  );

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks", taskFilters],
    queryFn: () =>
      api
        .get(
          `/tasks?search=${taskFilters.search}&priority=${taskFilters.priority}`,
        )
        .then((res: any) => res.data || []),
    refetchInterval: 60 * 1000, // refetch every 60 seconds
    refetchOnWindowFocus: true,
  });

  const { data: meetingsRes } = useQuery({
    queryKey: ["meetings-select"],
    queryFn: () =>
      api
        .get("/meetings?limit=100")
        .then((res: any) => res.data.meetings || []),
  });
  const meetingsList: Meeting[] = meetingsRes || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
      status: "Todo",
      dueDate: "",
      linkedMeeting: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskFormValues) =>
      api.post("/tasks", data).then((res: any) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsModalOpen(false);
      reset();
      addToast("Task created successfully", "success");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (updated: { id: string; data: Partial<TaskFormValues> }) =>
      api
        .put(`/tasks/${updated.id}`, updated.data)
        .then((res: any) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsModalOpen(false);
      setSelectedTask(null);
      reset();
      addToast("Task updated successfully", "success");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (updated: { id: string; status: TaskStatus }) =>
      api
        .put(`/tasks/${updated.id}`, { status: updated.status })
        .then((res: any) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast("Task status updated", "success");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsModalOpen(false);
      setSelectedTask(null);
      reset();
      addToast("Task deleted successfully", "success");
    },
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDraggedOverColumn(status);
  };

  const handleDragLeave = () => setDraggedOverColumn(null);

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    const id = e.dataTransfer.getData("text/plain");
    setDraggedOverColumn(null);
    if (id) updateStatusMutation.mutate({ id, status });
  };

  const onSubmit = (data: TaskFormValues) => {
    const payload = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      linkedMeeting: data.linkedMeeting || null,
    };

    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask._id, data: payload });
    } else {
      createTaskMutation.mutate(payload);
    }
  };

  const openCreateModal = () => {
    setSelectedTask(null);
    reset({
      title: "",
      description: "",
      priority: "Medium",
      status: "Todo",
      dueDate: "",
      linkedMeeting: "",
    });
    setIsModalOpen(true);
  };
  const toDatetimeLocalValue = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    reset({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? toDatetimeLocalValue(new Date(task.dueDate)) : "",
      linkedMeeting: task.linkedMeeting?._id || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setTaskToDelete(id);
    setIsConfirmOpen(true);
  };

  const executeDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete, {
        onSuccess: () => {
          setIsConfirmOpen(false);
          setTaskToDelete(null);
        },
      });
    }
  };

  // Neutral columns — status conveyed by label + count, not by hue
  const columns: { name: TaskStatus; title: string }[] = [
    { name: "Todo", title: "To Do" },
    { name: "In Progress", title: "In Progress" },
    { name: "Completed", title: "Completed" },
  ];

  const renderColumnTasks = (status: TaskStatus) => {
    const filtered = tasks.filter((t) => t.status === status);

    if (tasksLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={CheckSquare}
          title={`No ${status === "In Progress" ? "in-progress" : status.toLowerCase()} tasks`}
          description="Drag tasks here or create one for this column."
          action={{
            label: "Add task",
            onClick: () => {
              setSelectedTask(null);
              reset({
                title: "",
                description: "",
                priority: "Medium",
                status,
                dueDate: "",
                linkedMeeting: "",
              });
              setIsModalOpen(true);
            },
          }}
          className="py-8 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/[0.01]"
        />
      );
    }

    return (
      <AnimatePresence mode="popLayout">
        {filtered.map((task) => {
          const overdue = isOverdue(task.dueDate, task.status);
          return (
            <motion.div
              key={task._id}
              layoutId={task._id}
              draggable
              onDragStart={(e) =>
                handleDragStart(e as unknown as React.DragEvent, task._id)
              }
              onClick={() => openEditModal(task)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="
                p-4 
                rounded-2xl 
                bg-white dark:bg-slate-900/60
                border 
                border-slate-200 dark:border-white/5
                hover:border-slate-300 dark:hover:border-white/15
                hover:shadow-md dark:hover:shadow-none
                cursor-grab 
                active:cursor-grabbing 
                transition-all 
                space-y-3 
                group 
                relative
                shadow-sm
              "
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                  {task.title}
                </h4>
                <span
                  className={`
                  px-2 
                  py-0.5 
                  rounded-lg 
                  text-[9px] 
                  font-semibold 
                  uppercase 
                  shrink-0
                  border
                  ${
                    task.priority === "High"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                      : task.priority === "Medium"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20 text-slate-600 dark:text-slate-400"
                  }
                `}
                >
                  {task.priority}
                </span>
              </div>

              {task.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[9px] border-t border-slate-100 dark:border-white/5">
                {task.dueDate ? (
                  <span
                    className={`flex items-center gap-1 font-medium ${
                      overdue
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500"
                    }`}
                  >
                    {overdue ? (
                      <AlertCircle size={10} />
                    ) : (
                      <Calendar size={10} />
                    )}
                    {overdue ? "Overdue · " : ""}
                    {new Date(task.dueDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {task.dueDate && !task.googleEventId && (
                    <span
                      className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
                      title="This task's calendar event was removed on Google Calendar"
                    >
                      <CalendarX size={10} />
                      Unsynced
                    </span>
                  )}
                  {task.linkedMeeting && (
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 max-w-[120px] truncate">
                      <LinkIcon size={8} />
                      {task.linkedMeeting.title}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Tasks Board"
        description="Organize work across columns. Drag cards to update status."
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary"
          >
            <Plus size={16} aria-hidden />
            Create task
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
              <Search size={15} aria-hidden />
            </span>
            <input
              type="text"
              placeholder="Search tasks..."
              value={taskFilters.search}
              onChange={(e) => setTaskFilters({ search: e.target.value })}
              className="search-input"
            />
          </div>

          <select
            value={taskFilters.priority}
            onChange={(e) => setTaskFilters({ priority: e.target.value })}
            className="select-field py-2.5 text-xs w-auto min-w-[140px]"
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-start pb-4">
        {columns.map((col) => (
          <div
            key={col.name}
            onDragOver={(e) => handleDragOver(e, col.name)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.name)}
            className={`
              flex 
              flex-col 
              h-full 
              bg-slate-50 dark:bg-white/[0.02]
              border 
              rounded-3xl 
              p-4 
              space-y-4 
              min-h-[280px] md:min-h-[360px]
              max-h-[calc(100vh-16rem)]
              transition-all 
              duration-300
              ${
                draggedOverColumn === col.name
                  ? "border-slate-400 dark:border-white/30 bg-slate-100 dark:bg-white/[0.04]"
                  : "border-slate-200 dark:border-white/5"
              }
            `}
          >
            {/* Column Header */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.03] flex items-center justify-between shrink-0">
              <span className="text-xs font-bold font-sans uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {col.title}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 min-w-[18px] text-center">
                {tasks.filter((t) => t.status === col.name).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {renderColumnTasks(col.name)}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDeleteTask}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task? This cannot be undone."
        confirmText="Delete Task"
        cancelText="Cancel"
        isPending={deleteTaskMutation.isPending}
        type="danger"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTask ? "Task Details" : "Create New Task"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Task Title
            </label>
            <input
              {...register("title")}
              type="text"
              placeholder="Deploy project updates..."
              className="input-field"
            />
            {errors.title && (
              <span className="text-[10px] text-rose-500 dark:text-rose-400">
                {errors.title.message}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Description
            </label>
            <textarea
              {...register("description")}
              placeholder="Additional logs, assignee names, or details..."
              className="input-field h-24 resize-none py-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Priority
              </label>
              <select {...register("priority")} className="select-field py-3">
                <option value="High">🔥 High</option>
                <option value="Medium">⚡ Medium</option>
                <option value="Low">💤 Low</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Status
              </label>
              <select {...register("status")} className="select-field py-3">
                <option value="Todo">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Due Date
              </label>
              <input
                {...register("dueDate")}
                type="datetime-local"
                className="input-field"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Linked Meeting
              </label>
              <select
                {...register("linkedMeeting")}
                className="select-field py-3"
              >
                <option value="">Unlinked</option>
                {meetingsList.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 pt-4 mt-6">
            {selectedTask ? (
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTask._id)}
                disabled={deleteTaskMutation.isPending}
                className="
                  px-4 
                  py-2.5 
                  rounded-xl 
                  bg-rose-500/10 
                  hover:bg-rose-500/20 
                  text-rose-600 dark:text-rose-400 
                  text-xs 
                  font-semibold 
                  flex 
                  items-center 
                  gap-2 
                  transition-colors
                "
              >
                {deleteTaskMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Delete Task
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="
                  px-4 
                  py-2.5 
                  rounded-xl 
                  bg-slate-100 dark:bg-white/5
                  hover:bg-slate-200 dark:hover:bg-white/10 
                  text-slate-600 dark:text-slate-400 
                  hover:text-slate-900 dark:hover:text-slate-200 
                  text-xs 
                  font-semibold 
                  transition-colors
                "
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  createTaskMutation.isPending || updateTaskMutation.isPending
                }
                className="
                  px-5 
                  py-2.5 
                  rounded-xl 
                  bg-slate-900 dark:bg-white
                  hover:bg-slate-800 dark:hover:bg-slate-200 
                  text-white dark:text-slate-900
                  text-xs 
                  font-semibold 
                  flex 
                  items-center 
                  gap-2 
                  transition-colors
                  disabled:opacity-50
                "
              >
                {(createTaskMutation.isPending ||
                  updateTaskMutation.isPending) && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                {selectedTask ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
