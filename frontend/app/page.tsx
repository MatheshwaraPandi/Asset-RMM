import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-5xl rounded-3xl border border-black/5 bg-white/80 p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Asset RMM</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
          Remote asset inventory and tracking
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Use the console to authenticate and view synced employee systems.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Admin Login
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}