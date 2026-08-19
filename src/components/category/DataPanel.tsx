import { cn } from "@/lib/cn";

type DataPanelProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
};

/** 表・数字向けの濃い黒ガラスパネル */
export function DataPanel({
  children,
  className,
  title,
  description,
}: DataPanelProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border bg-black/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md md:p-5",
        "border-[color:var(--museum-accent-border,#d4af3773)]",
        className,
      )}
    >
      {title ? (
        <header className="mb-3 border-b border-white/10 pb-2.5">
          <h2 className="text-[15px] font-medium text-[color:var(--museum-accent,#d4af37)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[11px] text-museum-ivory-soft">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
