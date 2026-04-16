import { getBackendBaseUrl } from "@/lib/backend-url";
import { formatValue } from "@/lib/asset";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getAsset(id: string) {
  const response = await fetch(
    `${getBackendBaseUrl()}/public/assets/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as any;
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14)_0%,transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.14)_0%,transparent_40%),linear-gradient(180deg,#0b0f1a_0%,#060812_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
            Employee Asset Details
          </p>
          <h1 className="mt-3 text-3xl font-black">Asset #{asset.id}</h1>
          <p className="mt-2 text-sm text-slate-300">
            Scanned via QR. Shows employee assignment and laptop system info.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <h2 className="text-lg font-black">Employee</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div><span className="text-slate-400">Name:</span> {formatValue(asset.employee_name)}</div>
              <div><span className="text-slate-400">Employee ID:</span> {formatValue(asset.employee_id)}</div>
              <div><span className="text-slate-400">Email:</span> {formatValue(asset.email)}</div>
              <div><span className="text-slate-400">Laptop No:</span> {formatValue(asset.laptop_no)}</div>
              <div><span className="text-slate-400">Charger No:</span> {formatValue(asset.charger_no)}</div>
              <div><span className="text-slate-400">Mouse No:</span> {formatValue(asset.mouse_no)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
            <h2 className="text-lg font-black">System info</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div><span className="text-slate-400">Hostname:</span> {formatValue(asset.hostname)}</div>
              <div><span className="text-slate-400">Serial:</span> {formatValue(asset.serial_number)}</div>
              <div><span className="text-slate-400">OS:</span> {formatValue(asset.os_name)}</div>
              <div><span className="text-slate-400">Brand:</span> {formatValue(asset.brand)}</div>
              <div><span className="text-slate-400">Model:</span> {formatValue(asset.model)}</div>
              <div><span className="text-slate-400">CPU:</span> {formatValue(asset.cpu)}</div>
              <div><span className="text-slate-400">RAM:</span> {formatValue(asset.ram)}</div>
              <div><span className="text-slate-400">Storage:</span> {formatValue(asset.storage)}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
