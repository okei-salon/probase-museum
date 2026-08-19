import { cn } from "@/lib/cn";

type SectionTitleProps = {
  title: string;
  className?: string;
  action?: React.ReactNode;
  as?: "h2" | "h3";
};

export function SectionTitle({
  title,
  className,
  action,
  as: Tag = "h2",
}: SectionTitleProps) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <Tag className="text-[10px] tracking-[0.16em] text-museum-gold md:text-[11px]">
        {title}
      </Tag>
      {action}
    </div>
  );
}
