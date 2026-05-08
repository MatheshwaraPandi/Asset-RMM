import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getBackendBaseUrl } from "@/lib/backend-url";
import type { Asset } from "@/lib/asset";
import { formatValue, normalizeServiceStatus } from "@/lib/asset";
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
    ["Repair Requested", "Handed Over to Tech Support Team", "In Service Center"].includes(
      normalizeServiceStatus(asset.service_status)
    )
  ).length;
  const invoices = assets.filter((asset) => asset.service_invoice_path).length;

  return (
<<<<<<< Updated upstream
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
=======
    <div className="flex min-h-screen">
      <SidebarNavigation 
        userRole={session.role as "admin" | "hr" | "employee"} 
        userName={displayName}
      />
      <main className="flex-1 md:ml-64 bg-transparent px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[32px] border p-8 backdrop-blur" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-200">
              {orgConfig.name}
            </p>
            <div className="mt-4 flex flex-col gap-5">
              <div>
                <h1 className="text-4xl font-black" style={{ color: "var(--text-strong)" }}>
                  {isEmployee ? `${displayName} Workspace` : "Operations Dashboard"}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                  {isEmployee
                    ? "View your assigned systems, update your visible asset details, and manage account access."
                    : "Unified view of organization assets, repair activity, device tracking, and employee operations."}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Metric label="Assets" value={assets.length} />
              <Metric label="Assigned" value={assets.filter((asset) => asset.employee_name || asset.employee_id).length} />
              <Metric label="In Service" value={inService} />
              <Metric label="Invoices" value={invoices} />
            </div>
          </section>

          <AccordionSection
            title={isEmployee ? "Assigned Asset Details" : "Organization Asset Register"}
            subtitle={isEmployee ? "Only assets assigned to your account are visible." : "Browse all organization devices and tickets."}
            defaultOpen
          >
          {isEmployee ? (
            <div className="space-y-4">
              {assets.length === 0 ? (
                <div className="rounded-3xl border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--panel-muted)", color: "var(--text-soft)" }}>
                  <p>No assets are currently assigned to your account.</p>
                  <p className="mt-2 text-sm">Please contact HR if you believe this is incorrect.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {assets.map((asset) => (
                    <Link key={asset.id} href={`/asset/${asset.id}`}>
                      <div className="group cursor-pointer overflow-hidden rounded-3xl border p-6 transition hover:border-sky-400/60 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15)]" style={{ borderColor: "var(--border)", background: "var(--panel-muted)" }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--text-soft)" }}>Device</p>
                            <h3 className="mt-2 text-xl font-black transition group-hover:text-sky-400" style={{ color: "var(--text-strong)" }}>
                              {formatValue(asset.laptop_no) || "Unnamed Device"}
                            </h3>
                            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{formatValue(asset.department) || "No Department assigned"}</p>
                          </div>
                          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${ normalizeServiceStatus(asset.service_status) === "In Service Center" ? "bg-amber-500/20 text-amber-200" : normalizeServiceStatus(asset.service_status) === "In Use" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-300"}`}>
                            {formatValue(normalizeServiceStatus(asset.service_status)) || "Pending"}
                          </div>
                        </div>
                        <div className="mt-5 grid gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
                          <div className="rounded-2xl p-4" style={{ background: "var(--panel)" }}>
                            <div className="text-xs" style={{ color: "var(--text-soft)" }}>Serial</div>
                            <div className="mt-1 font-mono text-sky-600 dark:text-sky-300">{formatValue(asset.serial_number) || "-"}</div>
                          </div>
                          <div className="rounded-2xl p-4" style={{ background: "var(--panel)" }}>
                            <div className="text-xs" style={{ color: "var(--text-soft)" }}>Assigned</div>
                            <div className="mt-1" style={{ color: "var(--text-strong)" }}>{asset.assignment_date ? new Date(asset.assignment_date).toLocaleDateString() : "-"}</div>
                          </div>
                        </div>
                        <div className="mt-5 flex items-center justify-between text-sm" style={{ color: "var(--text-soft)" }}>
                          <span>{asset.service_invoice_path ? "Invoice uploaded" : "Invoice pending"}</span>
                          <span className="text-sky-600 transition group-hover:translate-x-1 dark:text-sky-300">View</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                ))}
              </tbody>
            </table>
          </div>
        </section>
=======
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="p-4">
                        <div className="font-semibold text-white">{formatValue(asset.employee_name)}</div>
                        <div className="text-xs text-slate-400">{formatValue(asset.employee_id)}</div>
                      </td>
                      <td className="p-4 text-slate-300">{formatValue(asset.department)}</td>
                      <td className="p-4 text-slate-300">{formatValue(asset.laptop_no)}</td>
                      <td className="p-4 font-mono text-sky-300">{formatValue(asset.serial_number)}</td>
                      <td className="p-4 text-slate-300">{formatValue(normalizeServiceStatus(asset.service_status))}</td>
                      <td className="p-4 text-slate-300">{asset.service_invoice_path ? "Uploaded" : "-"}</td>
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
          )}
        </AccordionSection>

        {isEmployee ? (
          <AccordionSection
            title="Update My Asset Details"
            subtitle="Employees can keep their visible profile and delivery details current."
            defaultOpen={false}
          >
            <EmployeeAssetEditor accessToken={session.accessToken} assets={assets} />
          </AccordionSection>
        ) : null}

        {isEmployee ? (
          <AccordionSection
            title="Employee Access"
            subtitle="Update your login password and keep your employee account secure."
            defaultOpen={false}
          >
            <EmployeePasswordForm />
          </AccordionSection>
        ) : null}
>>>>>>> Stashed changes
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
