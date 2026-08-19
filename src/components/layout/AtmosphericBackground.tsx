import { cn } from "@/lib/cn";
import type { MediaAsset } from "@/config/media";
import type { BackgroundFrame } from "@/config/categoryThemes";

type AtmosphericBackgroundProps = {
  asset: MediaAsset;
  className?: string;
  priority?: boolean;
  frame?: BackgroundFrame;
};

/**
 * 写真背景レイヤー。UI文字・カードは含めない。
 * 博物館の奥に球場が見えるよう、薄いぼかし＋黒〜濃紺ヴェールを重ねる。
 */
export function AtmosphericBackground({
  asset,
  className,
  frame,
}: AtmosphericBackgroundProps) {
  const size = frame?.size ?? "210% auto";
  const position = frame?.position ?? "40% 100%";
  const blurPx = frame?.blurPx ?? 2;
  const baseFilter = frame?.filter;
  const filter = [baseFilter, blurPx > 0 ? `blur(${blurPx}px)` : null]
    .filter(Boolean)
    .join(" ");

  const veilClassName =
    frame?.veilClassName ?? "bg-[rgba(5,12,24,0.32)]";
  const overlayClassName =
    frame?.overlayClassName ??
    "bg-gradient-to-b from-black/20 via-transparent to-black/50";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden bg-[#050505]",
        className,
      )}
      aria-hidden
    >
      {asset.src ? (
        <div
          className="absolute inset-0 scale-105"
          style={{
            backgroundImage: `url(${asset.src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: size,
            backgroundPosition: position,
            filter: filter || undefined,
          }}
        />
      ) : null}

      {/* 黒〜濃紺の半透明ヴェール（球場は残しつつ情報を読みやすく） */}
      <div className={cn("absolute inset-0", veilClassName)} />
      <div className={cn("absolute inset-0", overlayClassName)} />
    </div>
  );
}
