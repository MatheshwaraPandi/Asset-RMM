import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import AdminClient from "./admin-client";

export default async function AdminPage() {
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
    <AdminClient
      accessToken={accessToken}
      currentRole={session.role ?? "admin"}
      currentUsername={session.user?.name ?? "operator"}
    />
  );
}
