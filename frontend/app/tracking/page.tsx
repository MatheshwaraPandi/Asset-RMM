import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import TrackingClient from "./tracking-client";
import SidebarNavigation from "@/components/sidebar-navigation";

export default async function TrackingPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
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
        <TrackingClient
          accessToken={accessToken}
          currentRole={session.role ?? "admin"}
          currentUsername={session.user?.name ?? "operator"}
        />
      </main>
    </div>
  );
}
