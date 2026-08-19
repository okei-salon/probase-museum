import { cn } from "@/lib/cn";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "aside";
  intensity?: "default" | "strong";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
};

const paddingMap = {
  none: "",
  sm: "p-3.5 md:p-4",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
} as const;

export function GlassCard({
  children,
  className,
  as: Tag = "div",
  intensity = "default",
  padding = "md",
  interactive = false,
}: GlassCardProps) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-card)]",
        intensity === "strong" ? "glass-surface-strong" : "glass-surface",
        interactive && "glass-interactive",
        paddingMap[padding],
        className,
      )}
    >
      <div className="relative z-[1] flex h-full min-h-0 flex-col">{children}</div>
    </Tag>
  );
}
