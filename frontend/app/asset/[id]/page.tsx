import AccordionSection from "@/components/accordion-section";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset } from "@/lib/asset";
import { formatValue, getAssetDisplayName } from "@/lib/asset";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getAsset(id: string, accessToken: string): Promise<Asset | null> {
  const response = await fetch(`${getBackendBaseUrl()}/assets/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as Asset;
}

function imgUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getBackendBaseUrl()}${path}`;
}

export default async function AssetPage(props: PageProps) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect("/login");
  }

  const asset = await getAsset(id, session.accessToken);
  if (!asset) {
    return (
      <main className="min-h-screen bg-theme-background px-4 py-10 text-theme-foreground">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <h1 className="text-2xl font-black">Asset not found</h1>
          <p className="mt-2 text-slate-300">This asset is unavailable or you do not have access.</p>
        </div>
      </main>
    );
  }

  const laptopFront = imgUrl(asset.laptop_front_image);
  const laptopRear = imgUrl(asset.laptop_rear_image);
  const mouseImg = imgUrl(asset.mouse_image);
  const chargerImg = imgUrl(asset.charger_image);
  const invoiceUrl = imgUrl(asset.service_invoice_path);
  const isAuthenticated = Boolean(session?.accessToken);

  return (
    <main className="min-h-screen bg-theme-background px-4 py-10 text-theme-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
            Employee Asset Details
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">{getAssetDisplayName(asset)}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {isAuthenticated
              ? "Secure authenticated asset details for your assigned device."
              : "Public preview only. Sign in to access your assigned asset securely."}
          </p>
        </header>

        <AccordionSection
          title="Employee & Assignment"
          subtitle="Employee ownership, location, and assignment details"
          defaultOpen
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="text-sm text-slate-400">Name</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatValue(asset.employee_name)}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="text-sm text-slate-400">Employee ID</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatValue(asset.employee_id)}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="text-sm text-slate-400">Email</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatValue(asset.email)}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="text-sm text-slate-400">Department</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatValue(asset.department)}</div>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="System Information" subtitle="Technical device details" defaultOpen={false}>
          <div className="grid gap-4 text-sm text-slate-200 md:grid-cols-2">
            <AssetField label="Hostname" value={asset.hostname} />
            <AssetField label="Serial Number" value={asset.serial_number} />
            <AssetField label="OS" value={asset.os_name} />
            <AssetField label="Brand" value={asset.brand} />
            <AssetField label="Model" value={asset.model} />
            <AssetField label="Model Number" value={asset.model_number} />
            <AssetField label="CPU" value={asset.cpu} />
            <AssetField label="RAM" value={asset.ram} />
            <AssetField label="Storage" value={asset.storage} />
            <AssetField label="Network" value={asset.network_connection} />
          </div>
        </AccordionSection>

        <AccordionSection title="Service Tracking" subtitle="Repair and invoice information" defaultOpen={false}>
          <div className="grid gap-4 text-sm text-slate-200 md:grid-cols-2">
            <AssetField label="Status" value={asset.service_status} />
            <AssetField label="Vendor" value={asset.service_vendor} />
            <AssetField label="Handover Date" value={asset.service_handover_date} />
            <AssetField label="Return Date" value={asset.service_return_date} />
            <AssetField label="Invoice Number" value={asset.service_invoice_number} />
            <AssetField label="Invoice Amount" value={asset.service_invoice_amount} />
            <AssetField label="Service Notes" value={asset.service_notes} colSpan={2} />
            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="text-sm text-slate-400">Invoice File</div>
              <div className="mt-2 text-base">
                {invoiceUrl ? (
                  <a href={invoiceUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline underline-offset-4">
                    Open invoice
                  </a>
                ) : (
                  <span className="text-slate-400">Not uploaded</span>
                )}
              </div>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="Asset Images" subtitle="Square thumbnail preview of uploaded photos" defaultOpen={false}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImagePreview title="Laptop Front" src={laptopFront} />
            <ImagePreview title="Laptop Rear" src={laptopRear} />
            <ImagePreview title="Mouse" src={mouseImg} />
            <ImagePreview title="Charger" src={chargerImg} />
          </div>
        </AccordionSection>
      </div>
    </main>
  );
}

function AssetField({
  label,
  value,
  colSpan = 1,
}: {
  label: string;
  value: string | null | undefined;
  colSpan?: number;
}) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2 rounded-3xl border border-white/10 bg-slate-950/75 p-5" : "rounded-3xl border border-white/10 bg-slate-950/75 p-5"}>
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{formatValue(value)}</div>
    </div>
  );
}

function ImagePreview({ title, src }: { title: string; src: string | null }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
      <div className="text-sm text-slate-400">{title}</div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={title} src={src} className="mt-3 h-64 w-full rounded-3xl object-cover" />
      ) : (
        <div className="mt-3 flex h-64 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/60 text-sm text-slate-500">
          Not uploaded
        </div>
      )}
    </div>
  );
}

