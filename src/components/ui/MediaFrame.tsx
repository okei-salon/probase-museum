import Image from "next/image";
import { cn } from "@/lib/cn";
import type { MediaAsset } from "@/config/media";

export type MediaTone = "warm" | "cool" | "gold" | "deep" | "ember" | "slate";

type MediaFrameProps = {
  asset: MediaAsset;
  className?: string;
  tone?: MediaTone;
  priority?: boolean;
  sizes?: string;
  fadeBottom?: boolean;
  showSheen?: boolean;
};

const toneStyles: Record<MediaTone, string> = {
  warm: "bg-[radial-gradient(ellipse_at_35%_18%,rgba(160,100,45,0.55),transparent_52%),linear-gradient(165deg,#2a1c12_0%,#120e0b_55%,#070605_100%)]",
  cool: "bg-[radial-gradient(ellipse_at_65%_22%,rgba(70,90,120,0.42),transparent_50%),linear-gradient(165deg,#141a22_0%,#0a0c10_58%,#050506_100%)]",
  gold: "bg-[radial-gradient(ellipse_at_50%_12%,rgba(212,181,106,0.38),transparent_52%),linear-gradient(170deg,#2a2010_0%,#120e08_55%,#060504_100%)]",
  deep: "bg-[radial-gradient(ellipse_at_40%_8%,rgba(120,85,40,0.4),transparent_48%),linear-gradient(180deg,#1a1510_0%,#0b0908_68%,#040403_100%)]",
  ember:
    "bg-[radial-gradient(ellipse_at_55%_30%,rgba(170,75,35,0.4),transparent_55%),linear-gradient(155deg,#241610_0%,#0d0908_58%,#040404_100%)]",
  slate:
    "bg-[radial-gradient(ellipse_at_50%_0%,rgba(100,100,110,0.3),transparent_48%),linear-gradient(180deg,#17171b_0%,#0b0b0d_65%,#050505_100%)]",
};

/**
 * 差し替え可能なメディア枠。
 * `asset.src` が null のときは映画的な仮ビジュアルを表示する。
 */
export function MediaFrame({
  asset,
  className,
  tone = "deep",
  priority = false,
  sizes = "100vw",
  fadeBottom = false,
  showSheen = true,
}: MediaFrameProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        fadeBottom &&
          "[mask-image:linear-gradient(to_bottom,black_52%,transparent_97%)]",
        className,
      )}
    >
      {asset.src ? (
        <Image
          src={asset.src}
          alt={asset.alt ?? ""}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover object-center"
        />
      ) : (
        <div className={cn("absolute inset-0", toneStyles[tone])} aria-hidden>
          <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.55)_0.6px,transparent_0.6px)] [background-size:18px_18px]" />
          {showSheen ? (
            <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.14)_0%,transparent_28%,transparent_62%,rgba(184,149,62,0.1)_100%)]" />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute left-1/2 top-[28%] h-24 w-24 -translate-x-1/2 rounded-full bg-museum-gold/10 blur-2xl" />
        </div>
      )}
    </div>
  );
}
