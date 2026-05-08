"use client";

import axios from "axios";
import { Edit3, Eye, EyeOff, FileText, KeyRound, MonitorSmartphone, Save, Upload, UserRound, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset } from "@/lib/asset";
import { formatValue, getAssetDisplayName, normalizeServiceStatus } from "@/lib/asset";
import {
  ASSET_IMAGE_ACCEPT,
  ASSET_IMAGE_MAX_SIZE_MB,
  validateAssetImageFile,
} from "@/lib/upload";

type EmployeeAssetEditorProps = {
  accessToken: string;
  assets: Asset[];
  onAssetsUpdated?: (assets: Asset[]) => void;
};

type SelfServiceForm = {
  employee_name: string;
  email: string;
  location: string;
  other_devices: string;
  laptop_username: string;
  laptop_password: string;
};

function getSelfServiceForm(asset: Asset): SelfServiceForm {
  return {
    employee_name: asset.employee_name ?? "",
    email: asset.email ?? "",
    location: asset.location ?? "",
    other_devices: asset.other_devices ?? "",
    laptop_username: asset.laptop_username ?? "",
    laptop_password: "",
  };
}

function getImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getBackendBaseUrl()}${path}`;
}

export default function EmployeeAssetEditor({
  accessToken,
  assets,
  onAssetsUpdated,
}: EmployeeAssetEditorProps) {
  const [localAssets, setLocalAssets] = useState<Asset[]>(assets);
  const [selectedId, setSelectedId] = useState<number | null>(assets[0]?.id ?? null);
  const [form, setForm] = useState<SelfServiceForm>(getSelfServiceForm(assets[0] ?? ({ id: 0 } as Asset)));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLaptopPassword, setShowLaptopPassword] = useState(false);
  const [laptopFrontFile, setLaptopFrontFile] = useState<File | null>(null);
  const [laptopRearFile, setLaptopRearFile] = useState<File | null>(null);
  const [mouseFile, setMouseFile] = useState<File | null>(null);
  const [chargerFile, setChargerFile] = useState<File | null>(null);

  useEffect(() => {
    setLocalAssets(assets);
    setSelectedId((current) => (current && assets.some((asset) => asset.id === current) ? current : assets[0]?.id ?? null));
  }, [assets]);

  const selectedAsset = useMemo(
    () => localAssets.find((asset) => asset.id === selectedId) ?? localAssets[0] ?? null,
    [localAssets, selectedId]
  );

  useEffect(() => {
    if (selectedAsset) {
      setForm(getSelfServiceForm(selectedAsset));
    }
  }, [selectedAsset]);

  const syncUpdatedAsset = (updated: Asset) => {
    const updatedAssets = localAssets.map((asset) => (asset.id === updated.id ? updated : asset));
    setLocalAssets(updatedAssets);
    onAssetsUpdated?.(updatedAssets);
  };

  const handleAssetImageSelection = (
    file: File | null,
    setter: (file: File | null) => void
  ) => {
    if (!file) {
      setter(null);
      return;
    }

    const validationError = validateAssetImageFile(file);
    if (validationError) {
      setError(validationError);
      setter(null);
      return;
    }

    setError("");
    setter(file);
  };

  const saveAsset = async () => {
    if (!selectedAsset) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.put<Asset>(
        `${getBackendBaseUrl()}/assets/${selectedAsset.id}/self-service`,
        form,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      syncUpdatedAsset(response.data);
      setForm(getSelfServiceForm(response.data));
      setSuccess("Your asset details were updated.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Unable to update asset details.");
      } else {
        setError("Unable to update asset details.");
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadImages = async () => {
    if (!selectedAsset) return;
    if (!laptopFrontFile && !laptopRearFile && !mouseFile && !chargerFile) {
      setError("Select at least one image before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const tokenResponse = await axios.post<{ upload_token: string }>(
        `${getBackendBaseUrl()}/assets/${selectedAsset.id}/self-service-upload-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const formData = new FormData();
      if (laptopFrontFile) formData.append("laptop_front", laptopFrontFile);
      if (laptopRearFile) formData.append("laptop_rear", laptopRearFile);
      if (mouseFile) formData.append("mouse", mouseFile);
      if (chargerFile) formData.append("charger", chargerFile);

      const uploadResponse = await fetch(
        `${getBackendBaseUrl()}/public/upload/${encodeURIComponent(tokenResponse.data.upload_token)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorBody = (await uploadResponse.json().catch(() => null)) as { detail?: string } | null;
        setError(errorBody?.detail ?? "Image upload failed.");
        return;
      }

      const updated = (await uploadResponse.json()) as Asset;
      syncUpdatedAsset(updated);
      setLaptopFrontFile(null);
      setLaptopRearFile(null);
      setMouseFile(null);
      setChargerFile(null);
      setSuccess("Your asset images were uploaded.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Image upload failed.");
      } else {
        setError("Image upload failed.");
      }
    } finally {
      setUploading(false);
    }
  };

  if (!selectedAsset) {
    return (
      <div className="rounded-3xl border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--panel-muted)", color: "var(--text-muted)" }}>
        No editable asset details are available for your account.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">Employee Self-Service</p>
          <h3 className="mt-2 text-2xl font-black" style={{ color: "var(--text-strong)" }}>{getAssetDisplayName(selectedAsset)}</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Update your visible asset details, upload supporting images, and monitor service progress from one workspace.
          </p>
        </div>
        {localAssets.length > 1 ? (
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>Assigned Asset</span>
            <select
              value={selectedAsset.id}
              onChange={(event) => setSelectedId(Number(event.target.value))}
              className="min-w-64 rounded-2xl border px-4 py-3 text-sm outline-none focus:border-amber-400"
              style={{ borderColor: "var(--border)", background: "var(--input-bg)", color: "var(--input-text)" }}
            >
              {localAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {getAssetDisplayName(asset)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-100">
          {success}
        </div>
      ) : null}

      <section className="rounded-[24px] border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="flex items-center gap-2">
          <UserRound size={18} style={{ color: "var(--text-soft)" }} />
          <h4 className="text-lg font-black" style={{ color: "var(--text-strong)" }}>Profile & Delivery Details</h4>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Employee Name" value={form.employee_name} onChange={(value) => setForm((current) => ({ ...current, employee_name: value }))} />
          <Field label="Organization Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
          <Field label="Location" value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} />
          <Field label="Assigned Accessories" value={form.other_devices} onChange={(value) => setForm((current) => ({ ...current, other_devices: value }))} />
        </div>
        <button
          type="button"
          onClick={saveAsset}
          disabled={saving}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Save size={16} className="animate-pulse" /> : <Edit3 size={16} />}
          {saving ? "Saving changes..." : "Save my asset details"}
        </button>
      </section>

      <section className="rounded-[24px] border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="flex items-center gap-2">
          <KeyRound size={18} style={{ color: "var(--text-soft)" }} />
          <h4 className="text-lg font-black" style={{ color: "var(--text-strong)" }}>Laptop Credentials</h4>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Keep the laptop account details aligned with your assigned device. The password field only sets a new value and is never shown back after saving.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="Laptop Username"
            value={form.laptop_username}
            onChange={(value) => setForm((current) => ({ ...current, laptop_username: value }))}
          />
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>Laptop Password</span>
            <div className="flex gap-2">
              <input
                type={showLaptopPassword ? "text" : "password"}
                value={form.laptop_password}
                onChange={(event) => setForm((current) => ({ ...current, laptop_password: event.target.value }))}
                placeholder="Set or replace laptop password"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-amber-400"
                style={{ borderColor: "var(--border)", background: "var(--input-bg)", color: "var(--input-text)" }}
              />
              <button
                type="button"
                onClick={() => setShowLaptopPassword((current) => !current)}
                className="inline-flex items-center justify-center rounded-2xl border px-4"
                style={{ borderColor: "var(--border)", background: "var(--panel-muted)", color: "var(--text-strong)" }}
                aria-label={showLaptopPassword ? "Hide laptop password" : "Show laptop password"}
              >
                {showLaptopPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="text-xs" style={{ color: "var(--text-soft)" }}>
              Minimum 8 characters. Leave blank if you do not want to change the current stored password.
            </span>
          </label>
        </div>
        <button
          type="button"
          onClick={saveAsset}
          disabled={saving}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={14} />
          {saving ? "Saving credentials..." : "Save laptop credentials"}
        </button>
      </section>

      <section className="rounded-[24px] border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="flex items-center gap-2">
          <Upload size={18} style={{ color: "var(--text-soft)" }} />
          <h4 className="text-lg font-black" style={{ color: "var(--text-strong)" }}>Asset Images</h4>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Upload clear photos of the assigned laptop and accessories so support and HR always have the latest visual record.
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Use JPG or PNG images up to {ASSET_IMAGE_MAX_SIZE_MB} MB each. On mobile, you can take a picture directly with the camera.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <UploadField label="Laptop Front" onChange={(file) => handleAssetImageSelection(file, setLaptopFrontFile)} preview={getImageUrl(selectedAsset.laptop_front_image)} />
          <UploadField label="Laptop Rear" onChange={(file) => handleAssetImageSelection(file, setLaptopRearFile)} preview={getImageUrl(selectedAsset.laptop_rear_image)} />
          <UploadField label="Mouse" onChange={(file) => handleAssetImageSelection(file, setMouseFile)} preview={getImageUrl(selectedAsset.mouse_image)} />
          <UploadField label="Charger" onChange={(file) => handleAssetImageSelection(file, setChargerFile)} preview={getImageUrl(selectedAsset.charger_image)} />
        </div>
        <button
          type="button"
          onClick={uploadImages}
          disabled={uploading}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload size={16} />
          {uploading ? "Uploading images..." : "Upload asset images"}
        </button>
      </section>

      <section className="rounded-[24px] border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="flex items-center gap-2">
          <Wrench size={18} style={{ color: "var(--text-soft)" }} />
          <h4 className="text-lg font-black" style={{ color: "var(--text-strong)" }}>Service Tracking</h4>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Monitor the current service state of your assigned asset and review the latest handover or invoice details.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ServiceStat label="Service Status" value={normalizeServiceStatus(selectedAsset.service_status)} />
          <ServiceStat label="Vendor" value={selectedAsset.service_vendor} />
          <ServiceStat label="Handover Date" value={selectedAsset.service_handover_date} />
          <ServiceStat label="Return Date" value={selectedAsset.service_return_date} />
          <ServiceStat label="Invoice Number" value={selectedAsset.service_invoice_number} />
          <ServiceStat label="Invoice Amount" value={selectedAsset.service_invoice_amount} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr,0.9fr]">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel-muted)" }}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>
              Service Notes
            </div>
            <div className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              {formatValue(selectedAsset.service_notes)}
            </div>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel-muted)" }}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>
              <FileText size={14} />
              Service Invoice
            </div>
            <div className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              {selectedAsset.service_invoice_path ? (
                <a
                  href={getImageUrl(selectedAsset.service_invoice_path) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sky-600 underline underline-offset-4 dark:text-sky-300"
                >
                  Open uploaded invoice
                </a>
              ) : (
                "No invoice uploaded"
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 rounded-3xl border p-4 text-sm md:grid-cols-3" style={{ borderColor: "var(--border)", background: "var(--panel-muted)", color: "var(--text-muted)" }}>
          <MetaStat label="Laptop" value={selectedAsset.laptop_no} />
          <MetaStat label="Department" value={selectedAsset.department} />
          <MetaStat label="Serial" value={selectedAsset.serial_number} />
        </div>
      </section>

      <section className="rounded-[24px] border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="flex items-center gap-2">
          <MonitorSmartphone size={18} style={{ color: "var(--text-soft)" }} />
          <h4 className="text-lg font-black" style={{ color: "var(--text-strong)" }}>Assigned Asset Snapshot</h4>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          A compact operational view of the same asset fields your support team uses most often.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ServiceStat label="Laptop No" value={selectedAsset.laptop_no} />
          <ServiceStat label="Laptop Username" value={selectedAsset.laptop_username} />
          <ServiceStat label="Charger No" value={selectedAsset.charger_no} />
          <ServiceStat label="Mouse No" value={selectedAsset.mouse_no} />
          <ServiceStat label="Headset No" value={selectedAsset.headset_no} />
          <ServiceStat label="Department" value={selectedAsset.department} />
          <ServiceStat label="Hostname" value={selectedAsset.hostname} />
          <ServiceStat label="Operating System" value={selectedAsset.os_name} />
          <ServiceStat label="Brand" value={selectedAsset.brand} />
          <ServiceStat label="Model" value={selectedAsset.model} />
          <ServiceStat label="RAM" value={selectedAsset.ram} />
          <ServiceStat label="Storage" value={selectedAsset.storage} />
        </div>
      </section>
    </div>
  );
}

function Field({
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
      <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-amber-400"
        style={{ borderColor: "var(--border)", background: "var(--input-bg)", color: "var(--input-text)" }}
      />
    </label>
  );
}

function UploadField({
  label,
  onChange,
  preview,
}: {
  label: string;
  onChange: (file: File | null) => void;
  preview: string | null;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>{label}</span>
      <input
        type="file"
        accept={ASSET_IMAGE_ACCEPT}
        capture="environment"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="block w-full rounded-2xl border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--input-bg)", color: "var(--input-text)" }}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={label}
          className="h-32 w-full rounded-2xl border object-contain"
          style={{ borderColor: "var(--border)", background: "var(--panel-muted)" }}
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-2xl border text-sm" style={{ borderColor: "var(--border)", background: "var(--panel-muted)", color: "var(--text-soft)" }}>
          No image uploaded
        </div>
      )}
    </label>
  );
}

function ServiceStat({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel-muted)" }}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>{label}</div>
      <div className="mt-2 text-sm font-semibold" style={{ color: "var(--text-strong)" }}>{formatValue(value)}</div>
    </div>
  );
}

function MetaStat({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>{label}</div>
      <div className="mt-1 font-semibold" style={{ color: "var(--text-strong)" }}>{formatValue(value)}</div>
    </div>
  );
}
