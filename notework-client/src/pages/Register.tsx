import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { api } from "../services/api";
import { useStore } from "../store/useStore";
import { normalizeUser, getPostAuthRedirect } from "../utils/auth";
import { User, Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { user, authReady, setUser } = useStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  if (authReady && user) {
    return <Navigate to={getPostAuthRedirect(user)} replace />;
  }

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await api.post("/auth/register", data);
      const normalized = normalizeUser(response.data.user);
      setUser(normalized);
      navigate(getPostAuthRedirect(normalized));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
          "Registration failed. Email may already be in use.",
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
              <User size={18} className="text-sky-400" />
            </div>
            <h1 className="text-[11px] font-semibold tracking-[0.25em] uppercase text-slate-500">
              MeetMind
            </h1>
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sign up to streamline your AI meeting analytics.
            </p>
          </div>

          {/* Error alert */}
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm leading-relaxed">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Full name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Full name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  {...register("name")}
                  type="text"
                  autoComplete="name"
                  placeholder="John Doe"
                  className={`
                    w-full
                    pl-10
                    pr-3.5
                    py-2.5
                    rounded-lg
                    bg-slate-950/60
                    border
                    ${errors.name ? "border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500" : "border-slate-700 focus:ring-sky-500/40 focus:border-sky-500"}
                    text-slate-100
                    placeholder-slate-600
                    focus:outline-none
                    focus:ring-2
                    text-sm
                    transition-colors
                  `}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-rose-400">{errors.name.message}</p>
              )}
            </div>

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
                <p className="text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="new-password"
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
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
