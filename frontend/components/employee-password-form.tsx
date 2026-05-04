"use client";

import { useState } from "react";
import { getBackendBaseUrl } from "@/lib/backend-url";

export default function EmployeePasswordForm() {
  const [login, setLogin] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(`${getBackendBaseUrl()}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, old_password: oldPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || data.message || "Unable to update password.");
        return;
      }

      setSuccess(data.message || "Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setError("Unable to update password. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      <p className="text-sm text-slate-400">
        Use your current login identifier and password to update your employee access password.
      </p>
      {error ? (
        <div className="rounded-2xl border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          Login identifier
          <input
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="username or email"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Current password
          <input
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            placeholder="current password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="new password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Update Employee Password"}
        </button>
      </form>
    </div>
  );
}
