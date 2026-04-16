import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    redirect("/login");
  }

  return <AdminClient accessToken={accessToken} />;
}
