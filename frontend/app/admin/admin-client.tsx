"use client";

import axios from "axios";
import jsPDF from "jspdf";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Building2, Box, Cpu, Download, Eye, EyeOff, FileText, KeyRound, Plus, RefreshCw, Save, ShieldCheck, Trash2, Upload, UserCog, Wrench } from "lucide-react";

import { getBackendBaseUrl } from "@/lib/backend-url";
import {
  Asset,
  AssignmentForm,
  ServiceForm,
  emptyForm,
  emptyServiceForm,
  formatValue,
  getAssetDisplayName,
  getAssignmentForm,
  getAssetPublicUrl,
  getServiceForm,
} from "@/lib/asset";
import { orgConfig } from "@/lib/org";

type AdminClientProps = {
  accessToken: string;
  currentRole: string;
  currentUsername: string;
};

type CredentialForm = {
  employee_username: string;
  password: string;
};

type CredentialInfo = {
  id: number;
  employee_username?: string | null;
  email?: string | null;
  password_configured: boolean;
};

const serviceStatuses = [
  "In Use",
  "Repair Requested",
  "Handed Over",
  "In Service Center",
  "Ready for Return",
  "Returned",
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "") || "asset-qr";
}

async function svgToPngDataUrl(svg: SVGSVGElement, size: number) {
  const svgMarkup = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("QR image could not be loaded."));
      nextImage.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export default function AdminClient({
  accessToken,
  currentRole,
  currentUsername,
}: AdminClientProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [credentialsForm, setCredentialsForm] = useState<CredentialForm>({ employee_username: "", password: "" });
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [assignmentTab, setAssignmentTab] = useState<"details" | "credentials">("details");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [creatingAsset, setCreatingAsset] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(false);
  const [showLaptopPassword, setShowLaptopPassword] = useState(false);

  const [laptopFrontFile, setLaptopFrontFile] = useState<File | null>(null);
  const [laptopRearFile, setLaptopRearFile] = useState<File | null>(null);
  const [mouseFile, setMouseFile] = useState<File | null>(null);
  const [chargerFile, setChargerFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const qrPrintRef = useRef<HTMLDivElement | null>(null);

  const canEditAssignment = currentRole === "admin" || currentRole === "hr";
  const canManageService = currentRole === "admin" || currentRole === "hr";

  const fetchCredentials = async (assetId: number, fallbackAsset?: Asset | null) => {
    try {
      const res = await axios.get<CredentialInfo>(`${getBackendBaseUrl()}/assets/${assetId}/credentials`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCredentialsForm({
        employee_username:
          res.data.employee_username ?? fallbackAsset?.employee_username ?? fallbackAsset?.email ?? "",
        password: "",
      });
      setPasswordConfigured(res.data.password_configured);
    } catch {
      setCredentialsForm({
        employee_username: fallbackAsset?.employee_username ?? fallbackAsset?.email ?? "",
        password: "",
      });
      setPasswordConfigured(false);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get<Asset[]>(`${getBackendBaseUrl()}/assets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAssets(res.data);
      if (selected) {
        const refreshed = res.data.find((asset) => asset.id === selected.id) ?? null;
        if (refreshed) {
          setSelected(refreshed);
          setForm(getAssignmentForm(refreshed));
          setServiceForm(getServiceForm(refreshed));
          fetchCredentials(refreshed.id, refreshed);
        }
      }
    } catch {
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
    return assets.filter((asset) =>
      [
        asset.employee_name,
        asset.employee_id,
        asset.serial_number,
        asset.hostname,
        asset.model,
        asset.headset_no,
        asset.other_devices,
        asset.department,
        asset.location,
        asset.service_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [assets, query]);

  const stats = useMemo(() => {
    const inService = assets.filter((asset) =>
      ["Repair Requested", "Handed Over", "In Service Center"].includes(
        asset.service_status ?? ""
      )
    ).length;
    const assigned = assets.filter((asset) => asset.employee_name || asset.employee_id).length;
    const invoices = assets.filter((asset) => asset.service_invoice_path).length;
    return {
      total: assets.length,
      assigned,
      inService,
      invoices,
    };
  }, [assets]);

  const openAsset = (asset: Asset) => {
    setSelected(asset);
    setForm(getAssignmentForm(asset));
    setServiceForm(getServiceForm(asset));
    setCredentialsForm({
      employee_username: asset.employee_username ?? asset.email ?? "",
      password: "",
    });
    setPasswordConfigured(false);
    setShowEmployeePassword(false);
    setShowLaptopPassword(false);
    setAssignmentTab("details");
    setLaptopFrontFile(null);
    setLaptopRearFile(null);
    setMouseFile(null);
    setChargerFile(null);
    setInvoiceFile(null);
    setError("");
    setSuccess("");
    fetchCredentials(asset.id, asset);
  };

  const createAsset = async () => {
    if (!canEditAssignment) return;
    setCreatingAsset(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post<Asset>(
        `${getBackendBaseUrl()}/assets`,
        {
          employee_name: "Unassigned Employee",
          employee_id: "",
          email: "",
          employee_username: "",
          laptop_username: "",
          laptop_no: "",
          charger_no: "",
          mouse_no: "",
          headset_no: "",
          other_devices: "",
          department: "",
          location: "",
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const created = res.data;
      setAssets((current) => [created, ...current]);
      openAsset(created);
      setSuccess("New employee asset created. Fill the details and save.");
    } catch {
      setError("Failed to create a new employee asset.");
    } finally {
      setCreatingAsset(false);
    }
  };

  const deleteSelectedAsset = async () => {
    if (!selected || !canEditAssignment) return;
    const label = getAssetDisplayName(selected);
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) {
      return;
    }

    setDeletingAsset(true);
    setError("");
    setSuccess("");
    try {
      await axios.delete(`${getBackendBaseUrl()}/assets/${selected.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAssets((current) => current.filter((asset) => asset.id !== selected.id));
      setSelected(null);
      setForm(emptyForm);
      setCredentialsForm({ employee_username: "", password: "" });
      setPasswordConfigured(false);
      setServiceForm(emptyServiceForm);
      setSuccess("Asset deleted successfully.");
    } catch {
      setError("Failed to delete asset.");
    } finally {
      setDeletingAsset(false);
    }
  };

  const imageUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${getBackendBaseUrl()}${path}`;
  };

  const saveAssignment = async () => {
    if (!selected || !canEditAssignment) return;
    setSavingAssignment(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.put<Asset>(
        `${getBackendBaseUrl()}/assets/${selected.id}`,
        form,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const updated = res.data;
      setAssets((current) => current.map((asset) => (asset.id === updated.id ? updated : asset)));
      setSelected(updated);
      setForm(getAssignmentForm(updated));
      setCredentialsForm((current) => ({
        ...current,
        employee_username: current.employee_username || updated.employee_username || updated.email || "",
      }));
      setSuccess("Employee asset details updated.");
    } catch {
      setError("Failed to save asset assignment details.");
    } finally {
      setSavingAssignment(false);
    }
  };

  const saveCredentials = async () => {
    if (!selected || !canEditAssignment) return;
    setSavingCredentials(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.put<CredentialInfo>(
        `${getBackendBaseUrl()}/assets/${selected.id}/credentials`,
        credentialsForm,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setAssets((current) =>
        current.map((asset) =>
          asset.id === selected.id
            ? {
                ...asset,
                employee_username: res.data.employee_username ?? asset.employee_username,
              }
            : asset
        )
      );
      setSelected((current) =>
        current
          ? {
              ...current,
              employee_username: res.data.employee_username ?? current.employee_username,
            }
          : current
      );
      setCredentialsForm((current) => ({
        ...current,
        employee_username: res.data.employee_username ?? "",
        password: "",
      }));
      setPasswordConfigured(res.data.password_configured);
      setShowEmployeePassword(false);
      setSuccess("Employee credentials updated.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to save employee credentials.");
      } else {
        setError("Failed to save employee credentials.");
      }
    } finally {
      setSavingCredentials(false);
    }
  };

  const saveService = async () => {
    if (!selected || !canManageService) return;
    setSavingService(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.put<Asset>(
        `${getBackendBaseUrl()}/assets/${selected.id}/service`,
        serviceForm,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const updated = res.data;
      setAssets((current) => current.map((asset) => (asset.id === updated.id ? updated : asset)));
      setSelected(updated);
      setServiceForm(getServiceForm(updated));
      setSuccess("Service workflow updated.");
    } catch {
      setError("Failed to update service workflow.");
    } finally {
      setSavingService(false);
    }
  };

  const ensureUploadToken = async (assetId: number, currentToken?: string | null) => {
    if (currentToken) return currentToken;
    const tokenRes = await axios.post<{ upload_token: string }>(
      `${getBackendBaseUrl()}/assets/${assetId}/upload-token`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return tokenRes.data.upload_token;
  };

  const uploadImages = async () => {
    if (!selected) return;
    if (!laptopFrontFile && !laptopRearFile && !mouseFile && !chargerFile) {
      setError("Select at least one asset image before uploading.");
      return;
    }

    setUploadingImages(true);
    setError("");
    setSuccess("");

    try {
      const uploadToken = await ensureUploadToken(selected.id, selected.upload_token);
      const body = new FormData();
      if (laptopFrontFile) body.append("laptop_front", laptopFrontFile);
      if (laptopRearFile) body.append("laptop_rear", laptopRearFile);
      if (mouseFile) body.append("mouse", mouseFile);
      if (chargerFile) body.append("charger", chargerFile);

      const uploadRes = await fetch(
        `${getBackendBaseUrl()}/public/upload/${encodeURIComponent(uploadToken)}`,
        { method: "POST", body }
      );

      if (!uploadRes.ok) {
        setError("Image upload failed.");
        return;
      }

      const updated = (await uploadRes.json()) as Asset;
      const merged = { ...selected, ...updated, upload_token: uploadToken };
      setAssets((current) => current.map((asset) => (asset.id === merged.id ? merged : asset)));
      setSelected(merged);
      setLaptopFrontFile(null);
      setLaptopRearFile(null);
      setMouseFile(null);
      setChargerFile(null);
      setSuccess("Asset images uploaded.");
    } catch {
      setError("Image upload failed.");
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadInvoice = async () => {
    if (!selected || !invoiceFile || !canManageService) {
      return;
    }

    setUploadingInvoice(true);
    setError("");
    setSuccess("");
    try {
      const body = new FormData();
      body.append("invoice", invoiceFile);

      const res = await fetch(`${getBackendBaseUrl()}/assets/${selected.id}/service-invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      });

      if (!res.ok) {
        setError("Invoice upload failed.");
        return;
      }

      const updated = (await res.json()) as Asset;
      setAssets((current) => current.map((asset) => (asset.id === updated.id ? updated : asset)));
      setSelected(updated);
      setInvoiceFile(null);
      setSuccess("Service invoice uploaded.");
    } catch {
      setError("Invoice upload failed.");
    } finally {
      setUploadingInvoice(false);
    }
  };

  const downloadSelectedQrPdf = async () => {
    if (!selected || !qrPrintRef.current) return;

    const qrSvg = qrPrintRef.current.querySelector("svg");
    if (!(qrSvg instanceof SVGSVGElement)) {
      setError("QR code is not ready yet. Please try again.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const assetName = getAssetDisplayName(selected);
      const assetUrl = getAssetPublicUrl(selected.id);
      const qrImage = await svgToPngDataUrl(qrSvg, 900);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      const qrSize = 260;
      const qrX = (pageWidth - qrSize) / 2;
      let cursorY = 56;

      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(orgConfig.name, pageWidth / 2, cursorY, { align: "center" });

      cursorY += 26;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.text(assetName, pageWidth / 2, cursorY, { align: "center", maxWidth: pageWidth - margin * 2 });

      cursorY += 24;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Employee ID: ${String(formatValue(selected.employee_id))}   |   Laptop No: ${String(formatValue(selected.laptop_no))}`,
        pageWidth / 2,
        cursorY,
        { align: "center", maxWidth: pageWidth - margin * 2 }
      );

      cursorY += 28;
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(qrX - 16, cursorY - 16, qrSize + 32, qrSize + 32, 18, 18);
      doc.addImage(qrImage, "PNG", qrX, cursorY, qrSize, qrSize);

      cursorY += qrSize + 34;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Scan to view all details", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 24;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(3, 105, 161);
      const wrappedUrl = doc.splitTextToSize(assetUrl, pageWidth - margin * 2);
      doc.text(wrappedUrl, pageWidth / 2, cursorY, { align: "center", maxWidth: pageWidth - margin * 2 });

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated from ${orgConfig.name} on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 28,
        { align: "center" }
      );

      doc.save(`${sanitizeFilename(assetName)}-qr.pdf`);
      setSuccess("QR code PDF downloaded.");
    } catch {
      setError("Failed to generate the QR code PDF.");
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(2,6,23,0.45)] backdrop-blur">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.4fr,0.8fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                <Building2 size={14} />
                {orgConfig.name}
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white">
                Operations Console
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                {orgConfig.subtitle}. Monitor employee assets, maintain repair handover records,
                upload invoices, and keep HR aligned with IT operations from one workspace.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-300">
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  Logged in as {currentUsername}
                </div>
                <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-sky-100">
                  Role: {currentRole === "admin" ? "Default Admin" : "HR Admin"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard icon={<ShieldCheck size={18} />} label="Total Assets" value={stats.total} />
              <StatCard icon={<UserCog size={18} />} label="Assigned Users" value={stats.assigned} />
              <StatCard icon={<Wrench size={18} />} label="In Service" value={stats.inService} />
              <StatCard icon={<FileText size={18} />} label="Invoices" value={stats.invoices} />
            </div>
            <div className="mt-4 px-6 lg:px-8">
              <Link
                href="/device-dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                <Box size={16} />
                Device Dashboard
              </Link>
            </div>
          </div>
        </section>

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

        <section className="grid gap-6 xl:grid-cols-[1.05fr,1.2fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-5 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Organization Inventory
                </p>
                <h2 className="mt-2 text-2xl font-black">Employee Assets</h2>
              </div>
              <div className="flex gap-3">
                {canEditAssignment ? (
                  <button
                    onClick={createAsset}
                    disabled={creatingAsset}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
                  >
                    <Plus size={16} />
                    {creatingAsset ? "Creating..." : "New Employee"}
                  </button>
                ) : null}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search employee, serial, service status..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-400 lg:w-72"
                />
                <button
                  onClick={fetchAssets}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
                  Loading assets...
                </div>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
                  No assets found yet.
                </div>
              ) : null}

              {filtered.map((asset) => {
                const selectedClass = selected?.id === asset.id ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/5";
                return (
                  <button
                    key={asset.id}
                    onClick={() => openAsset(asset)}
                    className={`grid w-full gap-3 rounded-2xl border p-4 text-left transition hover:border-sky-300/40 hover:bg-white/10 ${selectedClass}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-bold text-white">{getAssetDisplayName(asset)}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {formatValue(asset.employee_id)} | {formatValue(asset.department)}
                        </div>
                      </div>
                      <ServiceBadge status={asset.service_status} />
                    </div>
                    <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                      <div>Serial: {formatValue(asset.serial_number)}</div>
                      <div>Hostname: {formatValue(asset.hostname)}</div>
                      <div>Model: {formatValue(asset.model)}</div>
                      <div>Location: {formatValue(asset.location)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-5 backdrop-blur">
            {selected ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Asset Workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {getAssetDisplayName(selected)} / {formatValue(selected.laptop_no)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      Public asset page:{" "}
                      <a
                        className="text-sky-300 underline underline-offset-4"
                        href={getAssetPublicUrl(selected.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open asset card
                      </a>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                    Last updated by {formatValue(selected.service_last_updated_by || currentUsername)}
                  </div>
                </div>

                <section className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black">Asset QR Code</h3>
                        <p className="mt-1 text-sm text-slate-300">
                          Scan to open the full asset details page.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={downloadSelectedQrPdf}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20"
                        >
                          <Download size={16} />
                          QR PDF
                        </button>
                        {canEditAssignment ? (
                          <button
                            onClick={deleteSelectedAsset}
                            disabled={deletingAsset}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            <Trash2 size={16} />
                            {deletingAsset ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div ref={qrPrintRef} className="mt-5 flex flex-col items-center rounded-2xl bg-white p-5 text-slate-900">
                      <QRCodeSVG value={getAssetPublicUrl(selected.id)} size={220} level="H" includeMargin />
                      <div className="mt-3 text-center text-sm font-semibold">
                        Scan to view all details
                      </div>
                      <a
                        href={getAssetPublicUrl(selected.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 break-all text-center text-xs font-semibold text-sky-700"
                      >
                        {getAssetPublicUrl(selected.id)}
                      </a>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-violet-300" />
                      <h3 className="text-lg font-black">Quick Summary</h3>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
                      <div>Employee: {formatValue(selected.employee_name)}</div>
                      <div>Employee ID: {formatValue(selected.employee_id)}</div>
                      <div>Employee Username: {formatValue(selected.employee_username ?? selected.email)}</div>
                      <div>Laptop Username: {formatValue(selected.laptop_username)}</div>
                      <div>Department: {formatValue(selected.department)}</div>
                      <div>Location: {formatValue(selected.location)}</div>
                      <div>Laptop No: {formatValue(selected.laptop_no)}</div>
                      <div>Headset No: {formatValue(selected.headset_no)}</div>
                      <div>Other Devices: {formatValue(selected.other_devices)}</div>
                      <div>Serial: {formatValue(selected.serial_number)}</div>
                      <div>Hostname: {formatValue(selected.hostname)}</div>
                      <div>OS: {formatValue(selected.os_name)}</div>
                      <div>Model: {formatValue(selected.model)}</div>
                      <div>Service Status: {formatValue(selected.service_status)}</div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-6 2xl:grid-cols-2">
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <UserCog size={16} className="text-sky-300" />
                      <h3 className="text-lg font-black">Employee Assignment</h3>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAssignmentTab("details")}
                          className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            assignmentTab === "details" ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          Assignment Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignmentTab("credentials")}
                          className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            assignmentTab === "credentials" ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          Employee Credentials
                        </button>
                      </div>
                    </div>

                    {assignmentTab === "details" ? (
                      <>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <Field label="Employee Name" value={form.employee_name} onChange={(value) => setForm({ ...form, employee_name: value })} disabled={!canEditAssignment} />
                          <Field label="Employee ID" value={form.employee_id} onChange={(value) => setForm({ ...form, employee_id: value })} disabled={!canEditAssignment} />
                          <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} disabled={!canEditAssignment} />
                          <Field label="Laptop Username" value={form.laptop_username} onChange={(value) => setForm({ ...form, laptop_username: value })} disabled={!canEditAssignment} />
                          <Field label="Department" value={form.department} onChange={(value) => setForm({ ...form, department: value })} disabled={!canEditAssignment} />
                          <Field label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} disabled={!canEditAssignment} />
                          <Field label="Laptop No" value={form.laptop_no} onChange={(value) => setForm({ ...form, laptop_no: value })} disabled={!canEditAssignment} />
                          <Field label="Charger No" value={form.charger_no} onChange={(value) => setForm({ ...form, charger_no: value })} disabled={!canEditAssignment} />
                          <Field label="Mouse No" value={form.mouse_no} onChange={(value) => setForm({ ...form, mouse_no: value })} disabled={!canEditAssignment} />
                          <Field label="Headset No" value={form.headset_no} onChange={(value) => setForm({ ...form, headset_no: value })} disabled={!canEditAssignment} />
                          <Field label="Other Devices" value={form.other_devices} onChange={(value) => setForm({ ...form, other_devices: value })} disabled={!canEditAssignment} />
                        </div>
                        <label className="mt-4 block space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Laptop Password
                          </span>
                          <div className="flex gap-2">
                            <input
                              type={showLaptopPassword ? "text" : "password"}
                              value={form.laptop_password}
                              onChange={(e) => setForm({ ...form, laptop_password: e.target.value })}
                              disabled={!canEditAssignment}
                              placeholder="Set or replace laptop password"
                              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLaptopPassword((current) => !current)}
                              disabled={!canEditAssignment}
                              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-900 px-4 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={showLaptopPassword ? "Hide password" : "Show password"}
                            >
                              {showLaptopPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <span className="text-xs text-slate-400">
                            Minimum 8 characters. Leave blank to keep the current laptop password.
                          </span>
                        </label>
                        <button
                          onClick={saveAssignment}
                          disabled={!canEditAssignment || savingAssignment}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                        >
                          <Save size={16} />
                          {savingAssignment ? "Saving..." : canEditAssignment ? "Save asset assignment" : "Admin or HR can edit assignment"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                          Use this tab to keep the employee login username and password aligned with the assigned asset.
                          The password is stored securely and is never shown again after saving.
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <Field
                            label="Employee Username"
                            value={credentialsForm.employee_username}
                            onChange={(value) => setCredentialsForm({ ...credentialsForm, employee_username: value })}
                            disabled={!canEditAssignment}
                          />
                          <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Password Status
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {passwordConfigured ? "Password configured" : "Password not set"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Login should still use the employee organization email unless you change your auth flow later.
                            </div>
                          </div>
                        </div>
                        <label className="mt-4 block space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Employee Password
                          </span>
                          <div className="flex gap-2">
                            <input
                              type={showEmployeePassword ? "text" : "password"}
                              value={credentialsForm.password}
                              onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
                              disabled={!canEditAssignment}
                              placeholder="Set or replace employee password"
                              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEmployeePassword((current) => !current)}
                              disabled={!canEditAssignment}
                              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-900 px-4 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={showEmployeePassword ? "Hide password" : "Show password"}
                            >
                              {showEmployeePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <span className="text-xs text-slate-400">
                            Minimum 8 characters. Leave it blank if you only want to update the username.
                          </span>
                        </label>
                        <button
                          onClick={saveCredentials}
                          disabled={!canEditAssignment || savingCredentials}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                        >
                          <KeyRound size={16} />
                          {savingCredentials ? "Saving credentials..." : canEditAssignment ? "Save employee credentials" : "Admin or HR can edit credentials"}
                        </button>
                      </>
                    )}
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <Wrench size={16} className="text-emerald-300" />
                      <h3 className="text-lg font-black">Repair & Service Workflow</h3>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Service Status
                        </span>
                        <select
                          value={serviceForm.service_status}
                          onChange={(e) => setServiceForm({ ...serviceForm, service_status: e.target.value })}
                          disabled={!canManageService}
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {serviceStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field label="Vendor / Service Center" value={serviceForm.service_vendor} onChange={(value) => setServiceForm({ ...serviceForm, service_vendor: value })} disabled={!canManageService} />
                      <Field label="Handover Date" type="date" value={serviceForm.service_handover_date} onChange={(value) => setServiceForm({ ...serviceForm, service_handover_date: value })} disabled={!canManageService} />
                      <Field label="Return Date" type="date" value={serviceForm.service_return_date} onChange={(value) => setServiceForm({ ...serviceForm, service_return_date: value })} disabled={!canManageService} />
                      <Field label="Invoice Number" value={serviceForm.service_invoice_number} onChange={(value) => setServiceForm({ ...serviceForm, service_invoice_number: value })} disabled={!canManageService} />
                      <Field label="Invoice Amount" value={serviceForm.service_invoice_amount} onChange={(value) => setServiceForm({ ...serviceForm, service_invoice_amount: value })} disabled={!canManageService} />
                    </div>
                    <label className="mt-4 block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Service Notes
                      </span>
                      <textarea
                        value={serviceForm.service_notes}
                        onChange={(e) => setServiceForm({ ...serviceForm, service_notes: e.target.value })}
                        disabled={!canManageService}
                        rows={4}
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                    <button
                      onClick={saveService}
                      disabled={!canManageService || savingService}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      <Save size={16} />
                      {savingService ? "Saving..." : "Save service workflow"}
                    </button>
                  </section>
                </div>

                <div className="grid gap-6 2xl:grid-cols-[1.05fr,0.95fr]">
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <Upload size={16} className="text-sky-300" />
                      <h3 className="text-lg font-black">Asset Images</h3>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <UploadField label="Laptop Front" onChange={setLaptopFrontFile} preview={imageUrl(selected.laptop_front_image)} />
                      <UploadField label="Laptop Rear" onChange={setLaptopRearFile} preview={imageUrl(selected.laptop_rear_image)} />
                      <UploadField label="Mouse" onChange={setMouseFile} preview={imageUrl(selected.mouse_image)} />
                      <UploadField label="Charger" onChange={setChargerFile} preview={imageUrl(selected.charger_image)} />
                    </div>
                    <button
                      onClick={uploadImages}
                      disabled={uploadingImages}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      <Upload size={16} />
                      {uploadingImages ? "Uploading..." : "Upload asset images"}
                    </button>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-amber-300" />
                      <h3 className="text-lg font-black">Invoice & Audit</h3>
                    </div>
                    <div className="mt-4 space-y-4">
                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Upload Repair Invoice
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg"
                          onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                          disabled={!canManageService}
                          className="block w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </label>
                      <button
                        onClick={uploadInvoice}
                        disabled={!invoiceFile || uploadingInvoice || !canManageService}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                      >
                        <FileText size={16} />
                        {uploadingInvoice ? "Uploading invoice..." : "Upload invoice"}
                      </button>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
                        <div>Current Status: {formatValue(selected.service_status)}</div>
                        <div>Invoice Number: {formatValue(selected.service_invoice_number)}</div>
                        <div>Invoice Amount: {formatValue(selected.service_invoice_amount)}</div>
                        <div>Last Service Update By: {formatValue(selected.service_last_updated_by)}</div>
                        <div className="mt-2">
                          Invoice File:{" "}
                          {selected.service_invoice_path ? (
                            <a
                              href={imageUrl(selected.service_invoice_path) ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-300 underline underline-offset-4"
                            >
                              Open uploaded invoice
                            </a>
                          ) : (
                            <span className="text-slate-400">No invoice uploaded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-violet-300" />
                    <h3 className="text-lg font-black">System Inventory</h3>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
                    <div>Hostname: {formatValue(selected.hostname)}</div>
                    <div>OS: {formatValue(selected.os_name)}</div>
                    <div>Brand: {formatValue(selected.brand)}</div>
                    <div>Reference Model: {formatValue(selected.model)}</div>
                    <div>Model Number: {formatValue(selected.model_number)}</div>
                    <div>Serial: {formatValue(selected.serial_number)}</div>
                    <div>CPU: {formatValue(selected.cpu)}</div>
                    <div>Number of CPUs: {formatValue(selected.number_of_cpus)}</div>
                    <div>Cores per CPU: {formatValue(selected.cores_per_cpu)}</div>
                    <div>Logical Processors: {formatValue(selected.logical_processors)}</div>
                    <div>RAM: {formatValue(selected.ram)}</div>
                    <div>Disk: {formatValue(selected.storage)}</div>
                    <div>Network: {formatValue(selected.network_connection)}</div>
                    <div>OS Installed: {formatValue(selected.os_installation_date)}</div>
                    <div className="md:col-span-3">User Accounts: {formatValue(selected.user_accounts)}</div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex min-h-[640px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-slate-300">
                Select an employee asset from the left panel to manage assignment, service workflow, invoices, and inventory details.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-slate-300">{icon}<span className="text-xs uppercase tracking-[0.18em]">{label}</span></div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function ServiceBadge({ status }: { status?: string | null }) {
  const current = status || "In Use";
  const className =
    current === "Returned"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
      : current === "In Use"
        ? "bg-sky-500/15 text-sky-200 border-sky-400/30"
        : "bg-amber-500/15 text-amber-200 border-amber-400/30";
  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {current}
    </div>
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
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={label}
          src={preview}
          className="h-32 w-32 rounded-xl border border-white/10 bg-slate-950 object-contain"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-900/60 text-sm text-slate-500">
          No image uploaded
        </div>
      )}
    </label>
  );
}
