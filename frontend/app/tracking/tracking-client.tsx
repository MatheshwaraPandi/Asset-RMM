"use client";

import axios from "axios";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRightLeft, BookOpen, Boxes, CalendarClock, History, RefreshCw, Save, Search } from "lucide-react";

import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset, AssetTracking, AssetComponent } from "@/lib/asset";
import { formatValue, getAssetDisplayName } from "@/lib/asset";
import { orgConfig } from "@/lib/org";

type TrackingClientProps = {
  accessToken: string;
  currentRole: string;
  currentUsername: string;
};

const assetStatusOptions = ["In Use", "Spare", "Discarded"];
const assignmentStatusOptions = ["Assigned", "Unassigned", "Reassigned"];

export default function TrackingClient({
  accessToken,
  currentRole,
  currentUsername,
}: TrackingClientProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tracking, setTracking] = useState<AssetTracking | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assetStatus, setAssetStatus] = useState("In Use");
  const [assetStatusDate, setAssetStatusDate] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("Assigned");
  const [assignmentStatusDate, setAssignmentStatusDate] = useState("");
  const [components, setComponents] = useState<AssetComponent[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [componentStatus, setComponentStatus] = useState<Record<number, string>>({});
  const [savingComponent, setSavingComponent] = useState<number | null>(null);

  const fetchAssets = async () => {
    setLoadingAssets(true);
    setError("");
    try {
      const res = await axios.get<Asset[]>(`${getBackendBaseUrl()}/assets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAssets(res.data);
      setSelectedId((current) => current ?? res.data[0]?.id ?? null);
    } catch (err) {
      console.error("Failed to load assets:", err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else if (err.response?.status === 403) {
          setError("Access denied. Insufficient permissions.");
        } else if (err.response?.status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Failed to load assets: ${err.response?.data?.detail || err.message}`);
        }
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchTracking = async (assetId: number) => {
    setLoadingTracking(true);
    setError("");
    try {
      const res = await axios.get<AssetTracking>(`${getBackendBaseUrl()}/assets/${assetId}/tracking`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTracking(res.data);
      setAssetStatus(res.data.asset.asset_status ?? "In Use");
      setAssetStatusDate(res.data.asset.asset_status_date ?? "");
      setAssignmentStatus(res.data.asset.assignment_status ?? "Assigned");
      setAssignmentStatusDate(res.data.asset.assignment_status_date ?? "");
    } catch (err) {
      console.error("Failed to load asset tracking:", err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else if (err.response?.status === 403) {
          setError("Access denied. Insufficient permissions.");
        } else if (err.response?.status === 404) {
          setError("Asset not found.");
        } else if (err.response?.status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Failed to load asset tracking: ${err.response?.data?.detail || err.message}`);
        }
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setLoadingTracking(false);
    }
  };

  const fetchComponents = async (assetId: number) => {
    setLoadingComponents(true);
    setError("");
    try {
      const res = await axios.get<AssetComponent[]>(`${getBackendBaseUrl()}/assets/${assetId}/components`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setComponents(res.data);
      setComponentStatus(
        res.data.reduce((acc, component) => {
          acc[component.id] = component.status ?? "In Use";
          return acc;
        }, {} as Record<number, string>)
      );
    } catch (err) {
      console.error("Failed to load components:", err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else if (err.response?.status === 403) {
          setError("Access denied. Insufficient permissions.");
        } else if (err.response?.status === 404) {
          setError("Asset components not found.");
        } else if (err.response?.status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Failed to load components: ${err.response?.data?.detail || err.message}`);
        }
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setLoadingComponents(false);
    }
  };

  const saveComponentStatus = async (componentId: number) => {
    const status = componentStatus[componentId];
    if (!status) return;
    setSavingComponent(componentId);
    setError("");
    setSuccess("");
    try {
      const res = await axios.put<AssetComponent>(
        `${getBackendBaseUrl()}/components/${componentId}`,
        { status },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setComponents((current) =>
        current.map((component) =>
          component.id === componentId ? { ...component, status: res.data.status ?? component.status } : component
        )
      );
      setSuccess("Component status updated.");
    } catch {
      setError("Failed to save component status.");
    } finally {
      setSavingComponent(null);
    }
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchTracking(selectedId);
      fetchComponents(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) =>
      [
        asset.employee_name,
        asset.employee_id,
        asset.email,
        asset.serial_number,
        asset.laptop_no,
        asset.asset_status,
        asset.assignment_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [assets, query]);

  const stats = useMemo(() => {
    return {
      total: assets.length,
      inUse: assets.filter((asset) => (asset.asset_status ?? "In Use") === "In Use").length,
      spare: assets.filter((asset) => asset.asset_status === "Spare").length,
      reassigned: assets.filter((asset) => asset.assignment_status === "Reassigned").length,
    };
  }, [assets]);

  const saveTracking = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.put<AssetTracking>(
        `${getBackendBaseUrl()}/assets/${selectedId}/tracking`,
        {
          asset_status: assetStatus,
          asset_status_date: assetStatusDate,
          assignment_status: assignmentStatus,
          assignment_status_date: assignmentStatusDate,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setTracking(res.data);
      setAssets((current) =>
        current.map((asset) => (asset.id === res.data.asset.id ? res.data.asset : asset))
      );
      setSuccess("Tracking details updated.");
    } catch {
      setError("Failed to save asset tracking details.");
    } finally {
      setSaving(false);
    }
  };

  const selectedAsset = tracking?.asset ?? assets.find((asset) => asset.id === selectedId) ?? null;

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-white relative">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_120px_rgba(2,6,23,0.45)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200">
            {orgConfig.name}
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black">Asset Tracking Center</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Track current asset status, assignment state, reassignment events, and the latest
                dates in one dedicated workspace for HR and IT operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                <ArrowLeft size={16} />
                Dashboard
              </Link>
              <Link
                href="/device-dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                <BookOpen size={16} />
                Device Dashboard
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-500"
              >
                <Boxes size={16} />
                Operations Console
              </Link>
              <button
                onClick={fetchAssets}
                disabled={loadingAssets}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loadingAssets ? "animate-spin" : ""} />
                {loadingAssets ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <MetricCard label="Total Assets" value={stats.total} icon={<Boxes size={16} />} />
            <MetricCard label="In Use" value={stats.inUse} icon={<CalendarClock size={16} />} />
            <MetricCard label="Spare" value={stats.spare} icon={<RefreshCw size={16} />} />
            <MetricCard label="Reassigned" value={stats.reassigned} icon={<ArrowRightLeft size={16} />} />
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-700/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={fetchAssets}
                disabled={loadingAssets}
                className="ml-4 rounded-lg bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-600/30 disabled:opacity-50"
              >
                {loadingAssets ? "Retrying..." : "Retry"}
              </button>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.92fr,1.28fr]">
          <aside className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-slate-200">
              <Search size={16} className="text-sky-300" />
              <h2 className="text-lg font-black">Tracked Assets</h2>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee, serial, laptop no, or status"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
            />
            <div className="mt-4 space-y-3">
              {loadingAssets ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                  Loading assets...
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                  No tracked assets found.
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const active = asset.id === selectedId;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-sky-400/50 bg-sky-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{getAssetDisplayName(asset)}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {formatValue(asset.employee_id)} | {formatValue(asset.laptop_no)}
                          </div>
                        </div>
                        <StatusChip tone="sky" label={asset.asset_status ?? "In Use"} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <StatusChip tone="emerald" label={asset.assignment_status ?? "Assigned"} />
                        <span>Updated: {formatValue(asset.asset_status_date ?? asset.last_updated)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {selectedAsset ? (
              <>
                <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                        Asset Tracking
                      </p>
                      <h2 className="mt-2 text-3xl font-black">{getAssetDisplayName(selectedAsset)}</h2>
                      <p className="mt-2 text-sm text-slate-300">
                        Managed by {currentUsername} ({currentRole.toUpperCase()})
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryPill label="Serial" value={selectedAsset.serial_number} />
                      <SummaryPill label="Laptop No" value={selectedAsset.laptop_no} />
                      <SummaryPill label="Current Asset Status" value={selectedAsset.asset_status ?? "In Use"} />
                      <SummaryPill label="Current Assignment" value={selectedAsset.assignment_status ?? "Assigned"} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 2xl:grid-cols-[1.05fr]">
                  <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={18} className="text-sky-300" />
                      <h3 className="text-xl font-black">Current Tracking Status</h3>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Asset Status">
                        <select
                          value={assetStatus}
                          onChange={(e) => setAssetStatus(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                        >
                          {assetStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Status Date">
                        <input
                          type="date"
                          value={assetStatusDate}
                          onChange={(e) => setAssetStatusDate(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                        />
                      </FieldBlock>
                      <FieldBlock label="Assignment Status">
                        <select
                          value={assignmentStatus}
                          onChange={(e) => setAssignmentStatus(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        >
                          {assignmentStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Assignment Date">
                        <input
                          type="date"
                          value={assignmentStatusDate}
                          onChange={(e) => setAssignmentStatusDate(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        />
                      </FieldBlock>
                    </div>

                    <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200 md:grid-cols-2">
                      <div>Employee: {formatValue(selectedAsset.employee_name)}</div>
                      <div>Employee ID: {formatValue(selectedAsset.employee_id)}</div>
                      <div>Email: {formatValue(selectedAsset.email)}</div>
                      <div>Department: {formatValue(selectedAsset.department)}</div>
                      <div>Asset status last updated: {formatValue(selectedAsset.asset_status_last_updated_at)}</div>
                      <div>Assignment last updated: {formatValue(selectedAsset.assignment_status_last_updated_at)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={saveTracking}
                      disabled={saving || loadingTracking}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      <Save size={16} />
                      {saving ? "Saving tracking..." : "Save tracking status"}
                    </button>
                  </section>
                </div>

                <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-2">
                    <Boxes size={18} className="text-cyan-300" />
                    <h3 className="text-xl font-black">Device Component Tracking</h3>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    Each hardware component is tracked individually. Update status for each device type and keep a clear audit trail for spares or discarded equipment.
                  </p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-300">
                          <th className="border-b border-white/10 px-4 py-3">Component</th>
                          <th className="border-b border-white/10 px-4 py-3">Identifier</th>
                          <th className="border-b border-white/10 px-4 py-3">Brand</th>
                          <th className="border-b border-white/10 px-4 py-3">Model</th>
                          <th className="border-b border-white/10 px-4 py-3">Color</th>
                          <th className="border-b border-white/10 px-4 py-3">Status</th>
                          <th className="border-b border-white/10 px-4 py-3">Assigned To</th>
                          <th className="border-b border-white/10 px-4 py-3">Location</th>
                          <th className="border-b border-white/10 px-4 py-3">Notes</th>
                          <th className="border-b border-white/10 px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingComponents ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                              Loading device tracking details...
                            </td>
                          </tr>
                        ) : components.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                              No component records found for this asset.
                            </td>
                          </tr>
                        ) : (
                          components.map((component) => (
                            <tr key={component.id} className="border-t border-white/10">
                              <td className="px-4 py-3 text-white">{component.component_type}</td>
                              <td className="px-4 py-3 text-slate-300">{formatValue(component.identifier)}</td>
                              <td className="px-4 py-3 text-slate-300">{formatValue(component.brand)}</td>
                              <td className="px-4 py-3 text-slate-300">{formatValue(component.model)}</td>
                              <td className="px-4 py-3 text-slate-300">{formatValue(component.color)}</td>
                              <td className="px-4 py-3 text-slate-300">
                                <select
                                  value={componentStatus[component.id] ?? component.status ?? "In Use"}
                                  onChange={(e) =>
                                    setComponentStatus((current) => ({
                                      ...current,
                                      [component.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                                >
                                  {assetStatusOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-slate-300">{formatValue(component.assigned_to)}</td>
                              <td className="px-4 py-3 text-slate-300">{formatValue(component.location)}</td>
                              <td className="px-4 py-3 text-slate-300">{formatValue(component.notes)}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => saveComponentStatus(component.id)}
                                  disabled={savingComponent === component.id}
                                  className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                                >
                                  {savingComponent === component.id ? "Saving..." : "Save"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="grid gap-6 2xl:grid-cols-2">
                  <HistoryCard
                    title="Asset Status History"
                    icon={<History size={16} className="text-sky-300" />}
                    emptyText="No asset status history yet."
                    items={(tracking?.status_history ?? []).map((entry) => ({
                      id: entry.id,
                      title: entry.status,
                      meta: `Effective ${formatValue(entry.effective_date)}`,
                      subtext: `Updated by ${formatValue(entry.updated_by)} on ${new Date(entry.created_at).toLocaleString()}`,
                    }))}
                  />
                  <HistoryCard
                    title="Assignment History"
                    icon={<History size={16} className="text-emerald-300" />}
                    emptyText="No assignment history yet."
                    items={(tracking?.assignment_history ?? []).map((entry) => ({
                      id: entry.id,
                      title: entry.assignment_status,
                      meta: `${formatValue(entry.employee_name)} | ${formatValue(entry.employee_id)}`,
                      subtext: `Effective ${formatValue(entry.effective_date)} | Updated by ${formatValue(entry.updated_by)} on ${new Date(entry.created_at).toLocaleString()}`,
                    }))}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-8 text-center text-slate-300">
                {loadingAssets ? "Loading tracking workspace..." : "Select an asset to manage its tracking history."}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "sky" | "emerald" }) {
  const className =
    tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : "border-sky-400/30 bg-sky-500/10 text-sky-100";
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function SummaryPill({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{formatValue(value)}</div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function HistoryCard({
  title,
  icon,
  emptyText,
  items,
}: {
  title: string;
  icon: ReactNode;
  emptyText: string;
  items: Array<{ id: number; title: string; meta: string; subtext: string }>;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xl font-black">{title}</h3>
      </div>
      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-6 text-center text-sm text-slate-400">
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-white">{item.title}</div>
                <div className="text-xs text-slate-400">{item.meta}</div>
              </div>
              <div className="mt-2 text-sm text-slate-300">{item.subtext}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
