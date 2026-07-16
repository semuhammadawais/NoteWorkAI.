import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { api } from "../services/api";
import { useStore } from "../store/useStore";
import { normalizeUser, getPostAuthRedirect } from "../utils/auth";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { user, authReady, setUser, addToast } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  if (authReady && user) {
    return <Navigate to={getPostAuthRedirect(user)} replace />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setLoading(true);
      const response = await api.post("/auth/login", data);
      const normalized = normalizeUser(response.data.user);
      setUser(normalized);
      navigate(getPostAuthRedirect(normalized));
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Invalid email or password",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[36rem] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black/40">
          {/* Brand header */}
          <div className="mb-8 text-center space-y-2">
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-3">
              <Lock size={18} className="text-sky-400" />
            </div>
            <h1 className="text-[11px] font-semibold tracking-[0.25em] uppercase text-slate-500">
              NoteWorkai
            </h1>
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sign in with your email and password to continue.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Email address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`
                    w-full
                    pl-10
                    pr-3.5
                    py-2.5
                    rounded-lg
                    bg-slate-950/60
                    border
                    ${errors.email ? "border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500" : "border-slate-700 focus:ring-sky-500/40 focus:border-sky-500"}
                    text-slate-100
                    placeholder-slate-600
                    focus:outline-none
                    focus:ring-2
                    text-sm
                    transition-colors
                  `}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`
                    w-full
                    pl-10
                    pr-3.5
                    py-2.5
                    rounded-lg
                    bg-slate-950/60
                    border
                    ${errors.password ? "border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500" : "border-slate-700 focus:ring-sky-500/40 focus:border-sky-500"}
                    text-slate-100
                    placeholder-slate-600
                    focus:outline-none
                    focus:ring-2
                    text-sm
                    transition-colors
                  `}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                mt-6
                py-2.5
                px-4
                rounded-lg
                bg-white
                hover:bg-slate-200
                active:bg-slate-300
                text-slate-900
                text-sm
                font-medium
                flex
                items-center
                justify-center
                gap-2
                shadow-lg
                shadow-black/20
                transition-all
                disabled:opacity-60
                disabled:pointer-events-none
              "
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
