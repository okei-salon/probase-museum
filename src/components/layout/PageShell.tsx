import { cn } from "@/lib/cn";
import { AtmosphericBackground } from "@/components/layout/AtmosphericBackground";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { homeBackgroundFrame } from "@/config/categoryThemes";
import type { MediaAsset } from "@/config/media";

type PageShellProps = {
  children: React.ReactNode;
  background: MediaAsset;
  className?: string;
};

/**
 * 全画面共通フレーム。
 * 背景 → ガラス → コンテンツ の3層を強制する。
 */
export function PageShell({
  children,
  background,
  className,
}: PageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AtmosphericBackground
        asset={background}
        frame={homeBackgroundFrame}
        priority
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className={cn("flex-1", className)}>{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
