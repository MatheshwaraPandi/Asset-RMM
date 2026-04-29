"use client";

import Link from "next/link";
import { useState } from "react";

import { getBackendBaseUrl } from "@/lib/backend-url";
import { orgConfig } from "@/lib/org";

export default function ResetPasswordPage() {
  const [login, setLogin] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!login.trim()) {
      setError("Username or organization email is required.");
      return;
    }

    if (!oldPassword.trim()) {
      setError("Old password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getBackendBaseUrl()}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim(),
          old_password: oldPassword,
          new_password: password,
        }),
      });

      const data = (await response.json().catch(() => null)) as { detail?: string; message?: string } | null;
      if (!response.ok) {
        setError(data?.detail ?? "Unable to reset password.");
        return;
      }

      setSuccess(data?.message ?? "Password updated successfully.");
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_32%),linear-gradient(180deg,#07131a_0%,#0f172a_48%,#111827_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-slate-950/75 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-emerald-200">
          {orgConfig.name}
        </p>
        <h1 className="mt-3 text-3xl font-black">Change employee password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Sign in with your employee username or organization email, then use your old password to set a new one manually.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-2xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
            {success} <Link href="/login" className="font-semibold underline underline-offset-4">Return to login</Link>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Username or organization email"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400"
            required
          />
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Old password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Updating password..." : "Save new password"}
          </button>
        </form>

        <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-slate-300 underline underline-offset-4">
          Back to login
        </Link>
      </div>
    </main>
  );
}
