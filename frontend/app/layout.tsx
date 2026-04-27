import type { Metadata } from "next";
import { orgConfig } from "@/lib/org";
import "./globals.css";

export const metadata: Metadata = {
  title: `${orgConfig.name} | RMM Lite`,
  description: "Asset inventory, HR visibility, and repair tracking console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
