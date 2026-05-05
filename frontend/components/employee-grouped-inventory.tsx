"use client";

import { Asset } from "@/lib/asset";
import { useState } from "react";
import { ChevronDown, Power, PowerOff } from "lucide-react";

interface EmployeeGroupedInventoryProps {
  assets: Asset[];
  onAssetSelect: (asset: Asset) => void;
  selectedAssetId: number | null;
  onAssetStatusToggle: (assetId: number, isActive: boolean) => Promise<void>;
  isTogglingStatus: boolean;
}

export default function EmployeeGroupedInventory({
  assets,
  onAssetSelect,
  selectedAssetId,
  onAssetStatusToggle,
  isTogglingStatus,
}: EmployeeGroupedInventoryProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group assets by employee
  const groupedAssets = assets.reduce(
    (acc, asset) => {
      const employeeName = asset.employee_name || "Unassigned";
      const employeeId = asset.employee_id || "N/A";
      const groupKey = `${employeeName}|${employeeId}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          name: employeeName,
          id: employeeId,
          assets: [],
          department: asset.department || "N/A",
        };
      }

      acc[groupKey].assets.push(asset);
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        id: string;
        assets: Asset[];
        department: string;
      }
    >
  );

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const sortedGroups = Object.entries(groupedAssets).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-2">
      {sortedGroups.map(([groupKey, group]) => {
        const isExpanded = expandedGroups.has(groupKey);
        const activeCount = group.assets.filter((a) => a.is_active !== false).length;
        const inactiveCount = group.assets.length - activeCount;

        return (
          <div key={groupKey} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupKey)}
              className="w-full flex items-center justify-between gap-4 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ChevronDown
                  size={18}
                  className={`transition-transform flex-shrink-0 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
                <div className="text-left min-w-0 flex-1">
                  <div className="text-base font-bold text-white truncate">
                    {group.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ID: {group.id} | Dept: {group.department}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 flex-shrink-0">
                <span className="bg-emerald-500/20 text-emerald-100 px-2.5 py-1 rounded-full">
                  Active: {activeCount}
                </span>
                {inactiveCount > 0 && (
                  <span className="bg-slate-500/20 text-slate-100 px-2.5 py-1 rounded-full">
                    Inactive: {inactiveCount}
                  </span>
                )}
              </div>
            </button>

            {/* Group Content */}
            {isExpanded && (
              <div className="border-t border-white/10 space-y-2 p-3 bg-black/20">
                {group.assets.map((asset) => {
                  const isSelected = selectedAssetId === asset.id;
                  const isActive = asset.is_active !== false;

                  return (
                    <div
                      key={asset.id}
                      className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "border-sky-400/50 bg-sky-500/10"
                          : "border-white/10 bg-white/5 hover:border-sky-300/40 hover:bg-white/10"
                      }`}
                    >
                      <button
                        onClick={() => onAssetSelect(asset)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm font-semibold text-white truncate">
                          {asset.laptop_no || `Asset #${asset.id}`}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          SN: {asset.serial_number || "N/A"}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {asset.brand} {asset.model}
                        </div>
                      </button>

                      {/* Status Toggle */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onAssetStatusToggle(asset.id, !isActive);
                        }}
                        disabled={isTogglingStatus}
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                            : "bg-slate-500/20 text-slate-100 hover:bg-slate-500/30"
                        } disabled:opacity-60`}
                        title={isActive ? "Active - Click to deactivate" : "Inactive - Click to activate"}
                      >
                        {isActive ? (
                          <Power size={16} />
                        ) : (
                          <PowerOff size={16} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
