import AccordionSection from "@/components/accordion-section";

import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset } from "@/lib/asset";
import { formatValue, getAssetDisplayName, normalizeServiceStatus } from "@/lib/asset";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getAsset(id: string): Promise<Asset | null> {
  const response = await fetch(`${getBackendBaseUrl()}/public/asset/${encodeURIComponent(id)}`, {
    cache: "no-store",
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

export default async function PublicAssetPage(props: PageProps) {
  const { id } = await props.params;

  const asset = await getAsset(id);
  if (!asset) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-white sm:py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-950/20 p-6 sm:p-8">
          <h1 className="text-2xl font-black sm:text-3xl">Asset not found</h1>
          <p className="mt-2 text-sm text-red-200 sm:text-base">The QR link points to an unknown asset.</p>
        </div>
      </main>
    );
  }

  const laptopFront = imgUrl(asset.laptop_front_image);
  const laptopRear = imgUrl(asset.laptop_rear_image);
  const mouseImg = imgUrl(asset.mouse_image);
  const chargerImg = imgUrl(asset.charger_image);
  const invoiceUrl = imgUrl(asset.service_invoice_path);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-3 py-6 text-white sm:px-4 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <header className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 sm:p-8 shadow-lg shadow-cyan-500/10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
            Asset Details
          </p>
          <h1 className="mt-3 text-2xl font-black text-white sm:text-4xl md:text-5xl">
            {getAssetDisplayName(asset)}
          </h1>
          <p className="mt-2 text-sm text-cyan-100 sm:text-base">
            Scanned via QR. Shows employee assignment, system info, and uploaded images.
          </p>
        </header>

        <AccordionSection
          title="Employee & Assignment"
          subtitle="Employee ownership, location, and assignment details"
          defaultOpen
        >
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <MobileAssetField label="Name" value={asset.employee_name} />
            <MobileAssetField label="Employee ID" value={asset.employee_id} />
            <MobileAssetField label="Email" value={asset.email} />
            <MobileAssetField label="Department" value={asset.department} />
            <MobileAssetField label="Location" value={asset.location} />
            <MobileAssetField label="Laptop Number" value={asset.laptop_no} />
            <MobileAssetField label="Mouse Number" value={asset.mouse_no} />
            <MobileAssetField label="Charger Number" value={asset.charger_no} />
          </div>
        </AccordionSection>

        <AccordionSection title="System Information" subtitle="Technical device details" defaultOpen={false}>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <MobileAssetField label="Hostname" value={asset.hostname} />
            <MobileAssetField label="Serial Number" value={asset.serial_number} />
            <MobileAssetField label="OS" value={asset.os_name} />
            <MobileAssetField label="Brand" value={asset.brand} />
            <MobileAssetField label="Model" value={asset.model} />
            <MobileAssetField label="Model Number" value={asset.model_number} />
            <MobileAssetField label="CPU" value={asset.cpu} />
            <MobileAssetField label="RAM" value={asset.ram} />
            <MobileAssetField label="Storage" value={asset.storage} />
            <MobileAssetField label="Network" value={asset.network_connection} />
          </div>
        </AccordionSection>

        <AccordionSection title="Service Tracking" subtitle="Repair and invoice information" defaultOpen={false}>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <MobileAssetField label="Status" value={normalizeServiceStatus(asset.service_status)} />
            <MobileAssetField label="Vendor" value={asset.service_vendor} />
            <MobileAssetField label="Handover Date" value={asset.service_handover_date} />
            <MobileAssetField label="Return Date" value={asset.service_return_date} />
            <MobileAssetField label="Invoice Number" value={asset.service_invoice_number} />
            <MobileAssetField label="Invoice Amount" value={asset.service_invoice_amount} />
            <div className="md:col-span-2 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4 sm:p-5 shadow-lg">
              <div className="text-sm font-semibold text-cyan-300 sm:text-base">Service Notes</div>
              <div className="mt-2 text-base font-semibold text-white sm:text-lg">{formatValue(asset.service_notes)}</div>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4 sm:p-5 shadow-lg">
              <div className="text-sm font-semibold text-cyan-300 sm:text-base">Invoice File</div>
              <div className="mt-2 text-base sm:text-lg">
                {invoiceUrl ? (
                  <a href={invoiceUrl} target="_blank" rel="noreferrer" className="text-amber-300 font-semibold underline underline-offset-4 hover:text-amber-200">
                    Open invoice
                  </a>
                ) : (
                  <span className="text-slate-400">Not uploaded</span>
                )}
              </div>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="Asset Images" subtitle="Uploaded photos of equipment" defaultOpen={false}>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <PublicImagePreview title="Laptop Front" src={laptopFront} />
            <PublicImagePreview title="Laptop Rear" src={laptopRear} />
            <PublicImagePreview title="Mouse" src={mouseImg} />
            <PublicImagePreview title="Charger" src={chargerImg} />
          </div>
        </AccordionSection>
      </div>
    </main>
  );
}

function MobileAssetField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4 sm:p-5 shadow-lg hover:border-cyan-400/40 transition-colors">
      <div className="text-xs font-bold uppercase tracking-wide text-cyan-300 sm:text-sm">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-white sm:text-lg break-words">
        {formatValue(value)}
      </div>
    </div>
  );
}

function PublicImagePreview({ title, src }: { title: string; src: string | null }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-3 sm:p-4 shadow-lg overflow-hidden">
      <div className="text-sm font-bold text-cyan-300 sm:text-base">{title}</div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={title}
          src={src}
          className="mt-3 w-full rounded-2xl object-cover shadow-lg max-h-96 sm:max-h-80"
        />
      ) : (
        <div className="mt-3 flex h-40 sm:h-64 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-900/40 text-xs sm:text-sm text-slate-400 font-semibold">
          Not uploaded
        </div>
      )}
    </div>
  );
}
