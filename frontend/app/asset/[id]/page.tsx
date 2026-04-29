import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset } from "@/lib/asset";
import { formatValue, getAssetDisplayName } from "@/lib/asset";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getAsset(id: string): Promise<Asset | null> {
  const response = await fetch(
    `${getBackendBaseUrl()}/public/assets/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );

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
  const asset = await getAsset(id);

  if (!asset) {
    return (
      <main className="min-h-screen bg-[#0B0F1A] px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <h1 className="text-2xl font-black">Asset not found</h1>
          <p className="mt-2 text-slate-300">The QR link points to an unknown asset.</p>
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14)_0%,transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.14)_0%,transparent_40%),linear-gradient(180deg,#0b0f1a_0%,#060812_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
            Employee Asset Details
          </p>
          <h1 className="mt-3 text-3xl font-black">{getAssetDisplayName(asset)}</h1>
          <p className="mt-2 text-sm text-slate-300">
            Scanned via QR. Shows employee assignment, system info, and uploaded images.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <h2 className="text-lg font-black">Employee</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div><span className="text-slate-400">Name:</span> {formatValue(asset.employee_name)}</div>
              <div><span className="text-slate-400">Employee ID:</span> {formatValue(asset.employee_id)}</div>
              <div><span className="text-slate-400">Email:</span> {formatValue(asset.email)}</div>
              <div><span className="text-slate-400">Department:</span> {formatValue(asset.department)}</div>
              <div><span className="text-slate-400">Location:</span> {formatValue(asset.location)}</div>
              <div><span className="text-slate-400">Laptop No:</span> {formatValue(asset.laptop_no)}</div>
              <div><span className="text-slate-400">Charger No:</span> {formatValue(asset.charger_no)}</div>
              <div><span className="text-slate-400">Mouse No:</span> {formatValue(asset.mouse_no)}</div>
              <div><span className="text-slate-400">Headset No:</span> {formatValue(asset.headset_no)}</div>
              <div><span className="text-slate-400">Other Devices:</span> {formatValue(asset.other_devices)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <h2 className="text-lg font-black">System info</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div><span className="text-slate-400">Hostname:</span> {formatValue(asset.hostname)}</div>
              <div><span className="text-slate-400">Serial:</span> {formatValue(asset.serial_number)}</div>
              <div><span className="text-slate-400">OS:</span> {formatValue(asset.os_name)}</div>
              <div><span className="text-slate-400">Brand:</span> {formatValue(asset.brand)}</div>
              <div><span className="text-slate-400">Reference Model:</span> {formatValue(asset.model)}</div>
              <div><span className="text-slate-400">Model Number:</span> {formatValue(asset.model_number)}</div>
              <div><span className="text-slate-400">CPU:</span> {formatValue(asset.cpu)}</div>
              <div><span className="text-slate-400">Number of CPUs:</span> {formatValue(asset.number_of_cpus)}</div>
              <div><span className="text-slate-400">Cores per CPU:</span> {formatValue(asset.cores_per_cpu)}</div>
              <div><span className="text-slate-400">Logical Processors:</span> {formatValue(asset.logical_processors)}</div>
              <div><span className="text-slate-400">RAM:</span> {formatValue(asset.ram)}</div>
              <div><span className="text-slate-400">HDD Size:</span> {formatValue(asset.storage)}</div>
              <div><span className="text-slate-400">Network Connection:</span> {formatValue(asset.network_connection)}</div>
              <div><span className="text-slate-400">OS Installation Date:</span> {formatValue(asset.os_installation_date)}</div>
              <div><span className="text-slate-400">User Accounts:</span> {formatValue(asset.user_accounts)}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <h2 className="text-lg font-black">Service tracking</h2>
          <div className="mt-4 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
            <div><span className="text-slate-400">Status:</span> {formatValue(asset.service_status)}</div>
            <div><span className="text-slate-400">Vendor:</span> {formatValue(asset.service_vendor)}</div>
            <div><span className="text-slate-400">Handover Date:</span> {formatValue(asset.service_handover_date)}</div>
            <div><span className="text-slate-400">Return Date:</span> {formatValue(asset.service_return_date)}</div>
            <div><span className="text-slate-400">Invoice Number:</span> {formatValue(asset.service_invoice_number)}</div>
            <div><span className="text-slate-400">Invoice Amount:</span> {formatValue(asset.service_invoice_amount)}</div>
            <div className="md:col-span-2"><span className="text-slate-400">Service Notes:</span> {formatValue(asset.service_notes)}</div>
            <div className="md:col-span-2">
              <span className="text-slate-400">Invoice File:</span>{" "}
              {invoiceUrl ? (
                <a href={invoiceUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline underline-offset-4">
                  Open invoice
                </a>
              ) : (
                "Not uploaded"
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <h2 className="text-lg font-black">Asset images</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Laptop front</div>
              {laptopFront ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Laptop front" src={laptopFront} className="mt-3 w-full rounded-lg" />
              ) : (
                <div className="mt-3 text-sm text-slate-400">Not uploaded</div>
              )}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Laptop rear</div>
              {laptopRear ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Laptop rear" src={laptopRear} className="mt-3 w-full rounded-lg" />
              ) : (
                <div className="mt-3 text-sm text-slate-400">Not uploaded</div>
              )}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mouse</div>
              {mouseImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Mouse" src={mouseImg} className="mt-3 w-full rounded-lg" />
              ) : (
                <div className="mt-3 text-sm text-slate-400">Not uploaded</div>
              )}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Charger</div>
              {chargerImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Charger" src={chargerImg} className="mt-3 w-full rounded-lg" />
              ) : (
                <div className="mt-3 text-sm text-slate-400">Not uploaded</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
