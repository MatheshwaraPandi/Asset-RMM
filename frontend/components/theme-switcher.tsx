"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Laptop, MoonStar, SunMedium } from "lucide-react";

const STORAGE_KEY = "asset-rmm-theme";
export type ThemeOption = "system" | "light" | "dark";

const options: Array<{
  value: ThemeOption;
  label: string;
  icon: typeof Laptop;
}> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: MoonStar },
];

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeOption) {
  const activeTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.dataset.theme = activeTheme;
  root.dataset.themeMode = theme;
}

function subscribe() {
  return () => {};
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeOption>(() => {
    if (typeof window === "undefined") {
      return "system";
    }
    return (window.localStorage.getItem(STORAGE_KEY) as ThemeOption | null) ?? "system";
  });
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if ((window.localStorage.getItem(STORAGE_KEY) as ThemeOption | null) === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="rounded-[22px] border border-white/10 bg-[color:var(--surface)] p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.28)] backdrop-blur-xl"
      >
      <div className="flex items-center gap-1">
        {options.map(({ value, label, icon: Icon }) => (
          <span
            key={value}
            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
            style={{ color: "var(--button-idle-text)" }}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="rounded-[22px] border border-white/10 bg-[color:var(--surface)] p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.28)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-1">
        {options.map(({ value, label, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold transition"
              style={
                active
                  ? {
                      background: "var(--button-active-bg)",
                      color: "var(--button-active-text)",
                      boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
                    }
                  : {
                      color: "var(--button-idle-text)",
                    }
              }
              aria-pressed={active}
              aria-label={`Switch to ${label.toLowerCase()} theme`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
