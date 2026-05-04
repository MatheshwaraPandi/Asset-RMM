import type { Metadata } from "next";
import { orgConfig } from "@/lib/org";
import ThemeSwitcher from "@/components/theme-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: `${orgConfig.name} | Asset Operations`,
  description: "Asset inventory, HR visibility, and repair tracking console",
};

const themeInitScript = `
(() => {
  const storageKey = "asset-rmm-theme";
  const stored = localStorage.getItem(storageKey) || "system";
  const resolved = stored === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : stored;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = stored;
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-theme-background text-theme-foreground transition-colors duration-300">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <main className="min-h-full">{children}</main>
        <div className="fixed bottom-5 left-5 z-50">
          <ThemeSwitcher />
        </div>
      </body>
    </html>
  );
}
