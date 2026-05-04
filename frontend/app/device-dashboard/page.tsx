import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import DeviceDashboardClient from "./device-dashboard-client";

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
    <DeviceDashboardClient
      accessToken={session.accessToken}
      currentRole={session.role ?? "admin"}
      currentUsername={session.user?.name ?? "operator"}
    />
  );
}
