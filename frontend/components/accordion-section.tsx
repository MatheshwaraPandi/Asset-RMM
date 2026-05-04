import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function AccordionSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-[24px] border p-4 shadow-sm transition hover:border-sky-400/40"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      open={defaultOpen}
    >
      <summary
        className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold outline-none transition hover:text-sky-500"
        style={{ color: "var(--text-strong)" }}
      >
        <div>
          <div>{title}</div>
          {subtitle ? <div className="mt-1 text-xs" style={{ color: "var(--text-soft)" }}>{subtitle}</div> : null}
        </div>
        <ChevronDown className="h-5 w-5 transition group-open:-rotate-180" style={{ color: "var(--text-soft)" }} />
      </summary>
      <div className="mt-5" style={{ color: "var(--text-muted)" }}>{children}</div>
    </details>
  );
}
