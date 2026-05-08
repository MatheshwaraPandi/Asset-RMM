"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getBackendBaseUrl } from "@/lib/backend-url";
import {
  ASSET_IMAGE_ACCEPT,
  ASSET_IMAGE_MAX_SIZE_MB,
  validateAssetImageFile,
} from "@/lib/upload";

type UploadInfo = {
  id: number;
  employee_name?: string | null;
  employee_id?: string | null;
  serial_number?: string | null;
  laptop_front_image?: string | null;
  laptop_rear_image?: string | null;
  mouse_image?: string | null;
  charger_image?: string | null;
};

function v(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function UploadPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [info, setInfo] = useState<UploadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [laptopFront, setLaptopFront] = useState<File | null>(null);
  const [laptopRear, setLaptopRear] = useState<File | null>(null);
  const [mouse, setMouse] = useState<File | null>(null);
  const [charger, setCharger] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const anySelected = useMemo(
    () => Boolean(laptopFront || laptopRear || mouse || charger),
    [laptopFront, laptopRear, mouse, charger]
  );

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${getBackendBaseUrl()}/public/upload/${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          setError("Upload link is invalid or expired.");
          setInfo(null);
          return;
        }

        setInfo((await res.json()) as UploadInfo);
      } catch {
        setError("Failed to load upload details.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

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

  const handleUpload = async () => {
    if (!token) return;
    if (!anySelected) {
      setError("Please select at least one image.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const form = new FormData();
      if (laptopFront) form.append("laptop_front", laptopFront);
      if (laptopRear) form.append("laptop_rear", laptopRear);
      if (mouse) form.append("mouse", mouse);
      if (charger) form.append("charger", charger);

      const res = await fetch(
        `${getBackendBaseUrl()}/public/upload/${encodeURIComponent(token)}`,
        {
          method: "POST",
          body: form,
        }
      );

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as { detail?: string } | null;
        setError(errorBody?.detail ?? "Upload failed.");
        return;
      }

      const updated = (await res.json()) as UploadInfo;
      setInfo((prev) => (prev ? { ...prev, ...updated } : updated));
      setSuccess("Uploaded successfully. You can close this page.");

      setLaptopFront(null);
      setLaptopRear(null);
      setMouse(null);
      setCharger(null);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
            Employee Upload
          </p>
          <h1 className="mt-3 text-2xl font-black">Upload Asset Images</h1>
          <p className="mt-2 text-sm text-slate-300">
            Upload photos of the laptop and accessories. Use JPG or PNG only, up to {ASSET_IMAGE_MAX_SIZE_MB} MB each.
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-slate-300">
            Loading...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-800/60 bg-rose-950/30 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        {info ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <div className="grid gap-2 text-sm text-slate-200">
              <div>
                <span className="text-slate-400">Asset ID:</span> {v(info.id)}
              </div>
              <div>
                <span className="text-slate-400">Employee:</span> {v(info.employee_name)} ({v(info.employee_id)})
              </div>
              <div>
                <span className="text-slate-400">Serial:</span> {v(info.serial_number)}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Laptop front view
                </div>
                <input
                  type="file"
                  accept={ASSET_IMAGE_ACCEPT}
                  capture="environment"
                  onChange={(e) => handleAssetImageSelection(e.target.files?.[0] ?? null, setLaptopFront)}
                />
              </label>
              <label className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Laptop rear view
                </div>
                <input
                  type="file"
                  accept={ASSET_IMAGE_ACCEPT}
                  capture="environment"
                  onChange={(e) => handleAssetImageSelection(e.target.files?.[0] ?? null, setLaptopRear)}
                />
              </label>
              <label className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mouse image
                </div>
                <input
                  type="file"
                  accept={ASSET_IMAGE_ACCEPT}
                  capture="environment"
                  onChange={(e) => handleAssetImageSelection(e.target.files?.[0] ?? null, setMouse)}
                />
              </label>
              <label className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Laptop charger image
                </div>
                <input
                  type="file"
                  accept={ASSET_IMAGE_ACCEPT}
                  capture="environment"
                  onChange={(e) => handleAssetImageSelection(e.target.files?.[0] ?? null, setCharger)}
                />
              </label>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload images"}
            </button>

            <p className="mt-3 text-xs text-slate-400">
              Tip: you can upload again later using the same link to replace images.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
