import React, { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { uploadAvatar, setAvatarUrl, removeAvatar } from "../services/avatar";
import { useStore } from "../store/useStore";
import { GlassCard } from "../components/GlassCard";
import { PageHeader } from "../components/ui/PageHeader";
import { Avatar } from "../components/Avatar";
import {
  User as UserIcon,
  Link as LinkIcon,
  Save,
  Loader2,
  Upload,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { isAdmin } from "../utils/auth";
import type { User } from "../types";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const avatarUrlSchema = z.object({
  url: z.string().url("Enter a valid image URL"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type AvatarUrlFormValues = z.infer<typeof avatarUrlSchema>;

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const Settings: React.FC = () => {
  const { user, setUser, addToast } = useStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUser = user
    ? { ...user, avatar: previewUrl ?? user.avatar }
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "" },
  });

  const urlForm = useForm<AvatarUrlFormValues>({
    resolver: zodResolver(avatarUrlSchema),
    defaultValues: {
      url: user?.avatarType === "url" ? (user.avatar ?? "") : "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) =>
      api
        .put("/auth/profile", data)
        .then((res: { data: { user: User } }) => res.data),
    onSuccess: (data) => {
      setUser(data.user);
      addToast("Profile updated successfully", "success");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      addToast(
        err.response?.data?.message || "Failed to update profile",
        "error",
      );
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file, setUploadProgress),
    onSuccess: (data) => {
      setUser(data.user);
      setPreviewUrl(null);
      setUploadProgress(0);
      addToast(data.message, "success");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setUploadProgress(0);
      addToast(err.response?.data?.message || "Avatar upload failed", "error");
    },
  });

  const urlMutation = useMutation({
    mutationFn: (url: string) => setAvatarUrl(url),
    onSuccess: (data) => {
      setUser(data.user);
      setPreviewUrl(data.user.avatar ?? null);
      addToast(data.message, "success");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      addToast(
        err.response?.data?.message || "Failed to set avatar URL",
        "error",
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (data) => {
      setUser(data.user);
      setPreviewUrl(null);
      urlForm.reset({ url: "" });
      addToast(data.message, "success");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      addToast(
        err.response?.data?.message || "Failed to remove avatar",
        "error",
      );
    },
  });

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only JPG, PNG, and WebP images are allowed.";
    }
    if (file.size > 2 * 1024 * 1024) {
      return "Image must be 2MB or smaller.";
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        addToast(error, "error");
        return;
      }
      setPreviewUrl(URL.createObjectURL(file));
      uploadMutation.mutate(file);
    },
    [addToast, uploadMutation],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const isAvatarBusy =
    uploadMutation.isPending ||
    urlMutation.isPending ||
    removeMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your profile and avatar across NoteWork AI."
      />

      {/* ── Profile Overview Card ── */}
      <GlassCard className="p-6 sm:p-8 border-slate-200 dark:border-white/5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <Avatar
            user={previewUser}
            size="lg"
            showRing
            loading={uploadMutation.isPending}
            className="shrink-0"
          />
          <div className="text-center sm:text-left space-y-1.5 min-w-0 flex-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {user?.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-500 capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                {user?.avatarType ?? "generated"} avatar
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isAdmin(user)
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5"
                }`}
              >
                {isAdmin(user) ? "Administrator" : "Member"}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Avatar Settings Card ── */}
      <GlassCard className="p-6 sm:p-8 space-y-5 border-slate-200 dark:border-white/5">
        <div className="space-y-1">
          <h3 className="section-title">Avatar</h3>
          <p className="section-description">
            Upload an image or link one from the web.
          </p>
        </div>

        <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 w-fit">
          {(["upload", "url"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab === "upload" ? "Upload" : "URL"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "upload" ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all
                  ${
                    isDragging
                      ? "border-slate-400 dark:border-white/40 bg-slate-100 dark:bg-white/10"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
                <ImagePlus
                  className="mx-auto mb-3 text-slate-400 dark:text-slate-500"
                  size={28}
                  aria-hidden
                />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Drag & drop or click to upload
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  JPG, PNG, WebP · max 2MB
                </p>
                {uploadMutation.isPending && (
                  <div className="mt-4 space-y-2">
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full bg-slate-900 dark:bg-white"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Uploading… {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="url"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={urlForm.handleSubmit((data) =>
                urlMutation.mutate(data.url),
              )}
              className="space-y-3"
            >
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 pointer-events-none">
                  <LinkIcon size={16} aria-hidden />
                </span>
                <input
                  {...urlForm.register("url")}
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  className="input-field pl-12 py-3.5"
                />
              </div>
              {urlForm.formState.errors.url && (
                <span className="text-xs text-rose-500 dark:text-rose-400 pl-1">
                  {urlForm.formState.errors.url.message}
                </span>
              )}
              <button
                type="submit"
                disabled={urlMutation.isPending || isAvatarBusy}
                className="btn-primary py-3"
              >
                {urlMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Upload size={16} aria-hidden />
                )}
                Apply URL
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => removeMutation.mutate()}
          disabled={isAvatarBusy}
          className="flex items-center gap-2 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors disabled:opacity-50 pt-1"
        >
          {removeMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          Remove avatar (use generated)
        </button>
      </GlassCard>

      {/* ── Personal Info Card ── */}
      <GlassCard className="p-6 sm:p-8 space-y-6 border-slate-200 dark:border-white/5">
        <div className="space-y-1">
          <h3 className="section-title">Personal information</h3>
          <p className="section-description">
            Update the name shown across your workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((data) => profileMutation.mutate(data))}
          className="space-y-6"
        >
          <div className="space-y-2">
            <label
              htmlFor="settings-name"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wider uppercase pl-1"
            >
              Full name
            </label>
            <div className="relative">
              <UserIcon
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />

              <input
                id="settings-name"
                {...register("name")}
                type="text"
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-300 py-3.5 pl-10 pr-4"
              />
            </div>
            {errors.name && (
              <span className="text-xs text-rose-500 dark:text-rose-400 pl-1">
                {errors.name.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="btn-primary w-full sm:w-auto py-3.5"
          >
            {profileMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save size={16} aria-hidden />
                Save name
              </>
            )}
          </button>
        </form>
      </GlassCard>
    </div>
  );
};
