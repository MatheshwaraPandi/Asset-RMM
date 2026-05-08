"use client";

import axios from "axios";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset, AssetComponent } from "@/lib/asset";
import { formatValue, getAssetDisplayName } from "@/lib/asset";
import { orgConfig } from "@/lib/org";

type DeviceDashboardClientProps = {
  accessToken: string;
  currentRole: string;
  currentUsername: string;
};

type ComponentForm = {
  component_type: string;
  identifier: string;
  brand: string;
  model: string;
  color: string;
  status: string;
  assigned_to: string;
  location: string;
  notes: string;
};

const componentTypes = ["Laptop", "Charger", "Mouse", "Headset", "Other Device"];
const componentStatusOptions = ["In Use", "Spare", "Discarded"];

const emptyComponentForm: ComponentForm = {
  component_type: "Laptop",
  identifier: "",
  brand: "",
  model: "",
  color: "",
  status: "In Use",
  assigned_to: "",
  location: "",
  notes: "",
};

export default function DeviceDashboardClient({
  accessToken,
}: DeviceDashboardClientProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [components, setComponents] = useState<AssetComponent[]>([]);
  const [componentForm, setComponentForm] = useState<ComponentForm>(emptyComponentForm);
  const [editForm, setEditForm] = useState<ComponentForm>(emptyComponentForm);
  const [editingComponent, setEditingComponent] = useState<AssetComponent | null>(null);
  const [query, setQuery] = useState("");
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAssetBrowserCollapsed, setIsAssetBrowserCollapsed] = useState(false);

  const fetchAssets = async () => {
    setLoadingAssets(true);
    setError("");
    try {
      const res = await axios.get<Asset[]>(`${getBackendBaseUrl()}/assets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAssets(res.data);
      setSelectedId((current) => current ?? res.data[0]?.id ?? null);
    } catch {
      setError("Unable to load assets. Reload the page or try again later.");
    } finally {
      setLoadingAssets(false);
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
    } catch {
      setError("Unable to load component tracking details.");
    } finally {
      setLoadingComponents(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      fetchComponents(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId]
  );

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) =>
      [asset.employee_name, asset.employee_id, asset.email, asset.laptop_no, asset.serial_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [assets, query]);

  const resetForm = () => setComponentForm(emptyComponentForm);

  const submitNewComponent = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.post<AssetComponent>(
        `${getBackendBaseUrl()}/assets/${selectedId}/components`,
        componentForm,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setComponents((current) => [res.data, ...current]);
      setSuccess("Component added successfully.");
      resetForm();
    } catch {
      setError("Failed to create new component.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (component: AssetComponent) => {
    setEditingComponent(component);
    setEditForm({
      component_type: component.component_type,
      identifier: component.identifier ?? "",
      brand: component.brand ?? "",
      model: component.model ?? "",
      color: component.color ?? "",
      status: component.status ?? "In Use",
      assigned_to: component.assigned_to ?? "",
      location: component.location ?? "",
      notes: component.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingComponent(null);
    setEditForm(emptyComponentForm);
  };

  const submitEditComponent = async () => {
    if (!editingComponent) return;
    setSavingEdit(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.put<AssetComponent>(
        `${getBackendBaseUrl()}/components/${editingComponent.id}`,
        editForm,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setComponents((current) => current.map((component) => (component.id === res.data.id ? res.data : component)));
      setSuccess("Component updated successfully.");
      cancelEdit();
    } catch {
      setError("Failed to save component changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteComponent = async (componentId: number) => {
    if (!window.confirm("Delete this component record?")) {
      return;
    }
    setDeletingId(componentId);
    setError("");
    setSuccess("");
    try {
      await axios.delete(`${getBackendBaseUrl()}/components/${componentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setComponents((current) => current.filter((component) => component.id !== componentId));
      setSuccess("Component record deleted.");
    } catch {
      setError("Failed to delete component.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                {orgConfig.name}
              </p>
              <h1 className="mt-2 text-4xl font-black">Device Operations Workspace</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Manage hardware component records with a cleaner operations workspace for inventory, replacements, and device history.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-700/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.98fr,1.4fr]">
          <aside className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-slate-200">
              <Search size={16} className="text-sky-300" />
              <h2 className="text-lg font-black">Select Asset</h2>
              <button
                type="button"
                onClick={() => setIsAssetBrowserCollapsed((current) => !current)}
                className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                {isAssetBrowserCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {isAssetBrowserCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>
            {!isAssetBrowserCollapsed ? (
              <>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by laptop number, serial, or employee ID"
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                />
                <div className="mt-4 space-y-3">
                  {loadingAssets ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                      Loading assets...
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                      No matching assets found.
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
                          <div className="font-semibold text-white">{getAssetDisplayName(asset)}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {formatValue(asset.employee_id)} | {formatValue(asset.laptop_no)}
                          </div>
                          <div className="mt-3 text-xs text-slate-300">
                            Serial: {formatValue(asset.serial_number)} | Model: {formatValue(asset.model)}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                Asset list collapsed. Expand when you need to browse or search.
              </div>
            )}
          </aside>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                    Device Asset Overview
                  </p>
                  <h2 className="mt-2 text-3xl font-black">
                    {selectedAsset ? getAssetDisplayName(selectedAsset) : "Select an asset"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Add or edit individual device components for the selected employee asset.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryPill label="Employee" value={selectedAsset?.employee_name ?? "Unassigned"} />
                  <SummaryPill label="Serial" value={selectedAsset?.serial_number} />
                </div>
              </div>
            </div>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-cyan-300" />
                <h3 className="text-xl font-black">Device Component Records</h3>
              </div>
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
                      <th className="border-b border-white/10 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingComponents ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                          Loading device components...
                        </td>
                      </tr>
                    ) : components.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                          No device components created for this asset.
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
                          <td className="px-4 py-3 text-slate-300">{formatValue(component.status)}</td>
                          <td className="px-4 py-3 text-slate-300">{formatValue(component.assigned_to)}</td>
                          <td className="px-4 py-3 text-slate-300">{formatValue(component.location)}</td>
                          <td className="px-4 py-3 text-slate-300">{formatValue(component.notes)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startEditing(component)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
                              >
                                <Edit3 size={14} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteComponent(component.id)}
                                disabled={deletingId === component.id}
                                className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-60"
                              >
                                <Trash2 size={14} />
                                {deletingId === component.id ? "Deleting" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-emerald-300" />
                <h3 className="text-xl font-black">{editingComponent ? "Edit Component" : "Add New Component"}</h3>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FieldBlock label="Component Type">
                  <select
                    value={editingComponent ? editForm.component_type : componentForm.component_type}
                    onChange={(e) =>
                      editingComponent
                        ? setEditForm((current) => ({ ...current, component_type: e.target.value }))
                        : setComponentForm((current) => ({ ...current, component_type: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                  >
                    {componentTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldBlock>
                <FieldBlock label="Status">
                  <select
                    value={editingComponent ? editForm.status : componentForm.status}
                    onChange={(e) =>
                      editingComponent
                        ? setEditForm((current) => ({ ...current, status: e.target.value }))
                        : setComponentForm((current) => ({ ...current, status: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                  >
                    {componentStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldBlock>
                <TextField
                  label="Identifier"
                  value={editingComponent ? editForm.identifier : componentForm.identifier}
                  onChange={(value) =>
                    editingComponent
                      ? setEditForm((current) => ({ ...current, identifier: value }))
                      : setComponentForm((current) => ({ ...current, identifier: value }))
                  }
                />
                <TextField
                  label="Brand"
                  value={editingComponent ? editForm.brand : componentForm.brand}
                  onChange={(value) =>
                    editingComponent
                      ? setEditForm((current) => ({ ...current, brand: value }))
                      : setComponentForm((current) => ({ ...current, brand: value }))
                  }
                />
                <TextField
                  label="Model"
                  value={editingComponent ? editForm.model : componentForm.model}
                  onChange={(value) =>
                    editingComponent
                      ? setEditForm((current) => ({ ...current, model: value }))
                      : setComponentForm((current) => ({ ...current, model: value }))
                  }
                />
                <TextField
                  label="Color"
                  value={editingComponent ? editForm.color : componentForm.color}
                  onChange={(value) =>
                    editingComponent
                      ? setEditForm((current) => ({ ...current, color: value }))
                      : setComponentForm((current) => ({ ...current, color: value }))
                  }
                />
                <TextField
                  label="Assigned To"
                  value={editingComponent ? editForm.assigned_to : componentForm.assigned_to}
                  onChange={(value) =>
                    editingComponent
                      ? setEditForm((current) => ({ ...current, assigned_to: value }))
                      : setComponentForm((current) => ({ ...current, assigned_to: value }))
                  }
                />
                <TextField
                  label="Location"
                  value={editingComponent ? editForm.location : componentForm.location}
                  onChange={(value) =>
                    editingComponent
                      ? setEditForm((current) => ({ ...current, location: value }))
                      : setComponentForm((current) => ({ ...current, location: value }))
                  }
                />
                <TextField
                  label="Notes"
                  value={editingComponent ? editForm.notes : componentForm.notes}
                  onChange={(value) =>
                    editingComponent
                      ? setEditForm((current) => ({ ...current, notes: value }))
                      : setComponentForm((current) => ({ ...current, notes: value }))
                  }
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={editingComponent ? submitEditComponent : submitNewComponent}
                  disabled={saving || savingEdit || !selectedId}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {editingComponent ? (savingEdit ? "Saving..." : "Save changes") : saving ? "Adding..." : "Add component"}
                </button>
                {editingComponent ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-white/5"
                  >
                    <Trash2 size={16} />
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
      />
    </label>
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

function SummaryPill({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{formatValue(value)}</div>
    </div>
  );
}
