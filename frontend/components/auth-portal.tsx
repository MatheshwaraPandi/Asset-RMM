"use client";

import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

import { orgConfig } from "@/lib/org";

type Mode = "employee" | "admin";

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
  const [mode, setMode] = useState<Mode>("employee");

  const [employeeLogin, setEmployeeLogin] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_32%),linear-gradient(180deg,#07131a_0%,#0f172a_48%,#111827_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.15fr,0.85fr]">
        <section className="rounded-[32px] border border-white/10 bg-white/6 p-8 text-white backdrop-blur">
          <div className="flex items-center gap-4">
            {orgConfig.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgConfig.logoUrl}
                alt={`${orgConfig.name} logo`}
                className="h-16 w-16 rounded-2xl border border-white/10 bg-white/95 object-contain p-2"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-lg font-black text-emerald-100">
                {orgConfig.shortName}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-emerald-200">
                {orgConfig.name}
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                Secure access for employees, HR, and IT on one login page.
              </h1>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">
            {orgConfig.subtitle}. Employees sign in with their username or organization email and password, while HR and
            IT admins continue with their console credentials from the same screen.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <InfoCard title="Username or Email" text="Assigned employees can sign in with either their employee username or their organization email." />
            <InfoCard title="Role Aware" text="Admins and HR keep their existing workflow, while employee access stays limited to their assigned asset records." />
            <InfoCard title="Manual Password" text="Admins can set a default password manually, and employees can later change it using their old and new password." />
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/75 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("employee");
                  setError("");
                  setSuccess("");
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${mode === "employee" ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
              >
                Employee Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("admin");
                  setError("");
                  setSuccess("");
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${mode === "admin" ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
              >
                Admin / HR
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-2xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          {mode === "employee" ? (
            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-slate-200">
                <KeyRound className="mt-0.5 h-5 w-5 text-emerald-300" />
                <div>
                  Use the employee username or organization email assigned in the admin console.
                  Your default password can be set manually from the Operations Console.
                </div>
              </div>

              <form onSubmit={loginWithEmployeePassword} className="space-y-4">
                <input
                  type="text"
                  value={employeeLogin}
                  onChange={(e) => setEmployeeLogin(e.target.value)}
                  placeholder="username or name@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400"
                  required
                />
                <input
                  type="password"
                  value={employeePassword}
                  onChange={(e) => setEmployeePassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400"
                  required
                />
                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {signingIn ? "Signing in..." : "Open employee dashboard"}
                </button>
              </form>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Mail className="h-4 w-4 text-emerald-300" />
                  Change password
                </div>
                <p className="text-sm text-slate-400">
                  Use your current password and a new password. No SMTP or email reset flow is required.
                </p>
              </div>

              <Link
                href="/reset-password"
                className="block text-center text-sm font-semibold text-emerald-200 underline underline-offset-4"
              >
                Change employee password
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/8 p-4 text-sm text-slate-200">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-300" />
                <div>Use your admin or HR credentials to open the operations console.</div>
              </div>

              <form onSubmit={loginWithCredentials} className="space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-sky-400"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-sky-400"
                  required
                />
                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full rounded-2xl bg-sky-500 px-4 py-4 text-sm font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                >
                  {signingIn ? "Signing in..." : "Open admin console"}
                </button>
              </form>

              <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <CredentialCard title="Default Admin" lineOne="Username: admin" lineTwo="Password: admin123" />
                <CredentialCard title="HR Admin" lineOne="Username: hradmin" lineTwo="Password: hr123" />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-lg font-black text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-300">{text}</div>
    </div>
  );
}

function CredentialCard({
  title,
  lineOne,
  lineTwo,
}: {
  title: string;
  lineOne: string;
  lineTwo: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="font-bold text-white">{title}</div>
      <div className="mt-1">{lineOne}</div>
      <div>{lineTwo}</div>
    </div>
  );
}
