import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import DeviceDashboardClient from "./device-dashboard-client";
import SidebarNavigation from "@/components/sidebar-navigation";

export default async function DeviceDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (!session.accessToken) {
    redirect("/login");
  }

  if (!["admin", "hr"].includes(session.role ?? "")) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNavigation 
        userRole={session.role as "admin" | "hr" | "employee"} 
        userName={session.user?.name ?? "Operator"}
      />
      <main className="flex-1 md:ml-64 bg-transparent">
        <DeviceDashboardClient
          accessToken={session.accessToken}
          currentRole={session.role ?? "admin"}
          currentUsername={session.user?.name ?? "operator"}
        />
      </main>
    </div>
  );
}
