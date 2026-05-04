"use client";

import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle, KeyRound, LogIn, ShieldCheck, X } from "lucide-react";

import { orgConfig } from "@/lib/org";

type Mode = "employee" | "admin" | null;

async function resetSessionState() {
  await signOut({ redirect: false });
  await fetch("/api/auth/signout", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      csrfToken: "reset-session",
      callbackUrl: "/login",
      json: "true",
    }),
  }).catch(() => null);
}

export default function AuthPortal() {
  const [mode, setMode] = useState<Mode>(null);
  const [employeeLogin, setEmployeeLogin] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForms = () => {
    setError("");
    setSuccess("");
    setEmployeeLogin("");
    setEmployeePassword("");
    setUsername("");
    setPassword("");
  };

  const loginWithEmployeePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSigningIn(true);

    try {
      await resetSessionState();
      const result = await signIn("employee-password", {
        login: employeeLogin,
        password: employeePassword,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid username/email or password.");
        return;
      }

      window.location.href = result.url ?? "/dashboard";
    } finally {
      setSigningIn(false);
    }
  };

  const loginWithCredentials = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSigningIn(true);

    try {
      await resetSessionState();
      const result = await signIn("admin-credentials", {
        username,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid admin or HR credentials.");
        return;
      }

      window.location.href = result.url ?? "/dashboard";
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6 shadow-[0_28px_100px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          {orgConfig.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={orgConfig.logoUrl}
              alt={`${orgConfig.name} logo`}
              className="h-16 w-16 rounded-[18px] border border-[color:var(--border)] bg-white/70 object-contain p-2 shadow-sm"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-emerald-400/35 bg-emerald-500/12 text-lg font-black text-emerald-700 shadow-sm">
              {orgConfig.shortName}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-black tracking-tight" style={{ color: "var(--text-strong)" }}>
            {orgConfig.name}
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
            Access your employee workspace or operations console from one compact sign-in panel.
          </p>
        </div>

        {mode === null ? (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                setMode("employee");
                setError("");
                setSuccess("");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              <KeyRound size={16} />
              Employee Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("admin");
                setError("");
                setSuccess("");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
            >
              <ShieldCheck size={16} />
              HR Admin Login
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-strong)" }}>
                  {mode === "employee" ? "Employee Access" : "Admin Access"}
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
                  {mode === "employee" ? "Review your assigned asset details and account access." : "Manage asset operations and support workflows."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  resetForms();
                }}
                className="rounded-full p-2 transition"
                style={{ color: "var(--text-soft)" }}
              >
                <X size={18} />
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-100">
                <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div>{success}</div>
              </div>
            ) : null}

            {mode === "employee" ? (
              <form onSubmit={loginWithEmployeePassword} className="space-y-4">
                <Field
                  label="Username or Email"
                  value={employeeLogin}
                  onChange={setEmployeeLogin}
                  placeholder="john.doe or john@company.com"
                />
                <Field
                  label="Password"
                  type="password"
                  value={employeePassword}
                  onChange={setEmployeePassword}
                  placeholder="Enter your password"
                />
                <button
                  type="submit"
                  disabled={signingIn}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-emerald-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogIn size={18} />
                  {signingIn ? "Signing in..." : "Sign In"}
                </button>
                <Link
                  href="/reset-password"
                  className="block text-center text-xs font-semibold underline underline-offset-2"
                  style={{ color: "var(--text-soft)" }}
                >
                  Forgot password? Reset here
                </Link>
              </form>
            ) : (
              <form onSubmit={loginWithCredentials} className="space-y-4">
                <Field
                  label="Admin Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="admin or hradmin"
                />
                <Field
                  label="Admin Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                />
                <button
                  type="submit"
                  disabled={signingIn}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-sky-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck size={18} />
                  {signingIn ? "Signing in..." : "Access Console"}
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-[16px] border px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
        style={{
          borderColor: "var(--border)",
          background: "var(--input-bg)",
          color: "var(--input-text)",
        }}
      />
    </label>
  );
}
