"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Pencil, RefreshCw, Save, X } from "lucide-react";

import { getBackendBaseUrl } from "@/lib/backend-url";
import {
  Asset,
  AssignmentForm,
  emptyForm,
  formatValue,
  getAssignmentForm,
  getAssetPublicUrl,
} from "@/lib/asset";

export default function AdminClient({ accessToken }: { accessToken: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get<Asset[]>(`${getBackendBaseUrl()}/assets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAssets(res.data);
    } catch (e) {
      setError("Failed to load assets. Make sure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => {
      const hay = [
        a.employee_name,
        a.employee_id,
        a.serial_number,
        a.hostname,
        a.model,
        a.laptop_no,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [assets, query]);

  const openEdit = (asset: Asset) => {
    setSelected(asset);
    setForm(getAssignmentForm(asset));
    setError("");
    setSuccess("");
  };

  const closeEdit = () => {
    setSelected(null);
    setForm(emptyForm);
    setSuccess("");
  };

  const qrUrl = selected ? getAssetPublicUrl(selected.id) : "";
  const qrUrlIsLocalhost =
    qrUrl.includes("://localhost") || qrUrl.includes("://127.0.0.1");

  const save = async () => {
    if (!selected) return;

    if (!form.employee_id || !form.laptop_no || !form.charger_no || !form.mouse_no) {
      setError(
        "Enter Employee ID, Laptop No, Charger No, and Mouse No before publishing the QR."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.put<Asset>(
        `${getBackendBaseUrl()}/assets/${selected.id}`,
        form,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      setAssets((cur) => cur.map((a) => (a.id === selected.id ? res.data : a)));
      setSelected(res.data);
      setForm(getAssignmentForm(res.data));
      setSuccess("Saved. QR is ready.");
    } catch (e) {
      setError("Save failed. Check admin login and backend logs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">
              Admin Console
            </p>
            <h1 className="mt-3 text-3xl font-black">Assets and QR Publishing</h1>
            <p className="mt-2 text-sm text-slate-300">
              Enter employee asset details, then generate a QR code that opens a
              mobile-friendly HTML page.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee, serial, hostname..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 md:w-80"
            />
            <button
              onClick={fetchAssets}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold hover:bg-slate-700"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-800/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/30">
          <table className="w-full text-left">
            <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Serial</th>
                <th className="p-4">Hostname</th>
                <th className="p-4">Model</th>
                <th className="p-4">Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={5}>
                    No assets found yet. Run the agent on an employee laptop to sync system info.
                  </td>
                </tr>
              ) : null}

              {filtered.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-t border-slate-900 hover:bg-slate-900/40"
                >
                  <td className="p-4">
                    <div className="font-semibold">
                      {asset.employee_name ?? "-"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {asset.employee_id ?? "-"}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sky-300">
                    {formatValue(asset.serial_number)}
                  </td>
                  <td className="p-4 text-slate-200">{formatValue(asset.hostname)}</td>
                  <td className="p-4 text-slate-200">{formatValue(asset.model)}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openEdit(asset)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold hover:border-sky-600"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Asset assignment</h2>
                <button
                  onClick={closeEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700"
                >
                  <X size={16} />
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Employee Name
                  </span>
                  <input
                    value={form.employee_name}
                    onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Employee ID
                  </span>
                  <input
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Email
                  </span>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Laptop No
                  </span>
                  <input
                    value={form.laptop_no}
                    onChange={(e) => setForm({ ...form, laptop_no: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Charger No
                  </span>
                  <input
                    value={form.charger_no}
                    onChange={(e) => setForm({ ...form, charger_no: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Mouse No
                  </span>
                  <input
                    value={form.mouse_no}
                    onChange={(e) => setForm({ ...form, mouse_no: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500"
                  />
                </label>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-900"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save and publish QR"}
              </button>

              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200">
                <div className="font-semibold text-white">System info</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div>Hostname: {formatValue(selected.hostname)}</div>
                  <div>Serial: {formatValue(selected.serial_number)}</div>
                  <div>OS: {formatValue(selected.os_name)}</div>
                  <div>CPU: {formatValue(selected.cpu)}</div>
                  <div>RAM: {formatValue(selected.ram)}</div>
                  <div>Storage: {formatValue(selected.storage)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
              <h2 className="text-xl font-black">QR Preview</h2>

              <div className="mt-6 flex flex-col items-center rounded-2xl bg-white p-6 text-slate-900">
                <QRCodeSVG value={qrUrl} size={240} level="H" includeMargin />
                <div className="mt-4 text-center text-sm font-semibold">
                  Scan with Google Lens
                </div>
                {qrUrlIsLocalhost ? (
                  <div className="mt-2 text-center text-xs font-semibold text-amber-700">
                    Your QR is using localhost. Add NEXT_PUBLIC_APP_URL to frontend/.env.local
                    as http://192.168.0.21:3000 and restart the frontend.
                  </div>
                ) : null}
                <a
                  className="mt-3 break-all text-center text-xs font-semibold text-sky-700"
                  href={qrUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {qrUrl}
                </a>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
