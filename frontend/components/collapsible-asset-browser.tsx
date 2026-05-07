"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

import type { Asset } from "@/lib/asset";
import { formatValue } from "@/lib/asset";

type CollapsibleAssetBrowserProps = {
  title: string;
  query: string;
  placeholder: string;
  onQueryChange: (value: string) => void;
  loading: boolean;
  emptyText: string;
  assets: Asset[];
  selectedId: number | null;
  onSelect: (assetId: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  statusContent?: (asset: Asset) => ReactNode;
  metaContent?: (asset: Asset) => ReactNode;
};

export default function CollapsibleAssetBrowser({
  title,
  query,
  placeholder,
  onQueryChange,
  loading,
  emptyText,
  assets,
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapsed,
  statusContent,
  metaContent,
}: CollapsibleAssetBrowserProps) {
  return (
    <aside className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Search size={16} className="text-sky-300" />
          <h2 className="text-lg font-black">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!collapsed ? (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
          />
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                Loading assets...
              </div>
            ) : assets.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                {emptyText}
              </div>
            ) : (
              assets.map((asset) => {
                const active = asset.id === selectedId;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-sky-400/50 bg-sky-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">
                          {formatValue(asset.laptop_no) !== "-" ? formatValue(asset.laptop_no) : `Asset #${asset.id}`}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Serial: {formatValue(asset.serial_number)}
                        </div>
                      </div>
                      {statusContent ? statusContent(asset) : null}
                    </div>
                    {metaContent ? (
                      <div className="mt-3 text-xs text-slate-300">{metaContent(asset)}</div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
          Asset list collapsed. Expand when you need to browse or search.
        </div>
      )}
    </aside>
  );
}
