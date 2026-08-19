import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { MediaFrame, type MediaTone } from "@/components/ui/MediaFrame";
import { MuseumIcon, type MuseumIconName } from "@/components/ui/MuseumIcon";
import type { MediaAsset } from "@/config/media";
import { cn } from "@/lib/cn";

export type MenuCardProps = {
  href: string;
  titleEn: string;
  titleJa: string;
  description: string;
  icon: MuseumIconName;
  image: MediaAsset;
  tone?: MediaTone;
  className?: string;
};

/** 添付完成デザインの6メニューカードを忠実再現 */
export function MenuCard({
  href,
  titleEn,
  titleJa,
  description,
  icon,
  image,
  tone = "deep",
  className,
}: MenuCardProps) {
  return (
    <Link href={href} className={cn("group block h-full", className)}>
      <GlassCard padding="none" className="h-full overflow-hidden rounded-lg">
        <div className="flex h-full flex-col">
          <MediaFrame
            asset={image}
            tone={tone}
            sizes="180px"
            showSheen={false}
            className="h-[76px] w-full"
          />

          <div className="flex flex-1 flex-col px-2.5 py-2.5">
            <div className="flex items-start gap-1.5">
              <MuseumIcon
                name={icon}
                size={15}
                className="mt-0.5 text-museum-gold"
              />
              <div className="min-w-0">
          <p className="font-display text-[11px] leading-snug tracking-[0.12em] text-museum-gold">
                  {titleEn}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-museum-ivory">
                  {titleJa}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-museum-ivory-muted">
              {description}
            </p>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
