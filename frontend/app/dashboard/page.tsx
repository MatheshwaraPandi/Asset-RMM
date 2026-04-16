import Link from "next/link";

import { getBackendBaseUrl } from "@/lib/backend-url";

type Asset = {
  id: number;
  employee_name: string | null;
  employee_id: string | null;
  email?: string | null;
  laptop_no?: string | null;
  charger_no?: string | null;
  mouse_no?: string | null;

  serial_number: string | null;
  model: string | null;
  hostname: string | null;
  os_name: string | null;
  brand: string | null;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
};

async function getAssets(): Promise<Asset[]> {
  const response = await fetch(`${getBackendBaseUrl()}/assets`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as Asset[];
}

function v(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default async function Dashboard() {
  const assets = await getAssets();

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Asset Management Console</h1>
          <p className="mt-2 text-sm text-slate-400">Showing {assets.length} assets</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-700"
          >
            Open Admin (QR)
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="p-4">Employee</th>
              <th className="p-4">Laptop No</th>
              <th className="p-4">Serial</th>
              <th className="p-4">Hostname</th>
              <th className="p-4">OS</th>
              <th className="p-4">CPU</th>
              <th className="p-4">RAM</th>
              <th className="p-4">Storage</th>
              <th className="p-4">Public Link</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                <td className="p-4">
                  <div className="font-semibold">{v(asset.employee_name)}</div>
                  <div className="text-xs text-slate-400">{v(asset.employee_id)}</div>
                </td>
                <td className="p-4">{v(asset.laptop_no)}</td>
                <td className="p-4 font-mono text-blue-300">{v(asset.serial_number)}</td>
                <td className="p-4">{v(asset.hostname)}</td>
                <td className="p-4">{v(asset.os_name)}</td>
                <td className="p-4">{v(asset.cpu)}</td>
                <td className="p-4">{v(asset.ram)}</td>
                <td className="p-4">{v(asset.storage)}</td>
                <td className="p-4">
                  <Link
                    href={`/asset/${asset.id}`}
                    className="text-sky-300 underline underline-offset-4 hover:text-sky-200"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
