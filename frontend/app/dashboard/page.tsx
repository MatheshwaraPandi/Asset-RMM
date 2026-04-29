import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset } from "@/lib/asset";
import { formatValue, getAssetDisplayName } from "@/lib/asset";
import { orgConfig } from "@/lib/org";

async function getAssets(accessToken: string): Promise<Asset[]> {
  const response = await fetch(`${getBackendBaseUrl()}/assets`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as Asset[];
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect("/login");
  }

  const assets = await getAssets(session.accessToken);
  const isEmployee = session.role === "employee";
  const displayName = session.user?.name || session.user?.email || "Operator";
  const inService = assets.filter((asset) =>
    ["Repair Requested", "Handed Over", "In Service Center"].includes(asset.service_status ?? "")
  ).length;
  const invoices = assets.filter((asset) => asset.service_invoice_path).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_34%),linear-gradient(180deg,#08111f_0%,#0f172a_45%,#111827_100%)] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
            {orgConfig.name}
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black">
                {isEmployee ? `${displayName} Asset Dashboard` : "RMM Lite Dashboard"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                {isEmployee
                  ? "View your assigned system information, repair progress, and uploaded records."
                  : "Unified view of organization assets, repair activity, and employee hardware tracking."}
              </p>
            </div>
            <div className="flex gap-3">
              {isEmployee ? null : (
                <>
                  <Link
                    href="/tracking"
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
                  >
                    Open Tracking Center
                  </Link>
                  <Link
                    href="/admin"
                    className="rounded-full bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-500"
                  >
                    Open Operations Console
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Metric label="Assets" value={assets.length} />
            <Metric label="Assigned" value={assets.filter((asset) => asset.employee_name || asset.employee_id).length} />
            <Metric label="In Service" value={inService} />
            <Metric label="Invoices" value={invoices} />
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/45 backdrop-blur">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-xl font-black">
              {isEmployee ? "Assigned Asset Register" : "Organization Asset Register"}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Laptop</th>
                  <th className="p-4">Serial</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Invoice</th>
                  <th className="p-4">Open</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="p-4">
                      <div className="font-semibold text-white">{getAssetDisplayName(asset)}</div>
                      <div className="text-xs text-slate-400">{formatValue(asset.employee_id)}</div>
                    </td>
                    <td className="p-4 text-slate-300">{formatValue(asset.department)}</td>
                    <td className="p-4 text-slate-300">{formatValue(asset.laptop_no)}</td>
                    <td className="p-4 font-mono text-sky-300">{formatValue(asset.serial_number)}</td>
                    <td className="p-4 text-slate-300">{formatValue(asset.service_status)}</td>
                    <td className="p-4 text-slate-300">
                      {asset.service_invoice_path ? "Uploaded" : "-"}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/asset/${asset.id}`}
                        className="text-sky-300 underline underline-offset-4 hover:text-sky-200"
                      >
                        Asset Card
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
    </div>
  );
}
