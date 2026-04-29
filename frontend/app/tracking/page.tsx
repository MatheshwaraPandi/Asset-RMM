import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import TrackingClient from "./tracking-client";

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
    <TrackingClient
      accessToken={accessToken}
      currentRole={session.role ?? "admin"}
      currentUsername={session.user?.name ?? "operator"}
    />
  );
}
