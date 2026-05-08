"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Monitor,
  Package, 
  Wrench, 
  Users, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { orgConfig } from "@/lib/org";

interface SidebarNavigationProps {
  userRole: "admin" | "hr" | "employee";
  userName: string;
}

export default function SidebarNavigation({ userRole, userName }: SidebarNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = userRole === "admin" || userRole === "hr";

  const navigationItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Users,
      description: isAdmin ? "Overview and workspace" : "View assigned assets",
      show: true,
    },
    {
      label: "Asset Management",
      href: "/admin",
      icon: Package,
      description: "Operations console",
      show: isAdmin,
    },
    {
      label: "Device Inventory",
      href: "/device-dashboard",
      icon: Monitor,
      description: "Component inventory",
      show: isAdmin,
    },
    {
      label: "Service Tracking",
      href: "/tracking",
      icon: Wrench,
      description: "Track repairs",
      show: isAdmin,
    },
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg border border-white/10 bg-white/5 p-2 md:hidden hover:bg-white/10"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } rounded-r-[32px] border-r border-white/10 bg-slate-950/60 backdrop-blur-xl flex flex-col`}
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center font-bold text-white">
              {orgConfig.shortName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-white truncate">{orgConfig.name}</h2>
              <p className="text-xs text-slate-400">Asset Management</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="border-b border-white/10 px-4 py-4">
          <div className="rounded-lg bg-white/5 p-3 border border-white/10">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-semibold text-white truncate mt-1">{userName}</p>
            <div className="mt-2 flex items-center gap-1 rounded px-2 py-1 bg-white/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
              <span className="text-xs text-emerald-100 capitalize">
                {userRole === "admin" ? "Default Admin" : userRole === "hr" ? "HR Admin" : "Employee"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {navigationItems
            .filter((item) => item.show)
            .map((item, index) => {
              const Icon = item.icon;
              const isCurrentActive = item.href ? isActive(item.href) : false;

              return (
                <Link
                  key={index}
                  href={item.href || "#"}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isCurrentActive
                      ? "bg-sky-500/20 text-sky-100 border border-sky-400/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</div>
                  </div>
                </Link>
              );
            })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 hover:text-rose-100 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
