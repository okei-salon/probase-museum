import { cn } from "@/lib/cn";
import { AtmosphericBackground } from "@/components/layout/AtmosphericBackground";
import { CategoryHeader } from "@/components/category/CategoryHeader";
import { Container } from "@/components/ui/Container";
import {
  categoryThemes,
  type CategoryThemeId,
} from "@/config/categoryThemes";

type CategoryShellProps = {
  theme: CategoryThemeId;
  back?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** 見出し＋一覧を1画面に収める画面向け */
  dense?: boolean;
};

/** カテゴリ画面共通シェル：背景写真 + アクセント + ヘッダー + コンテンツ */
export function CategoryShell({
  theme,
  back,
  children,
  className,
  contentClassName,
  dense = false,
}: CategoryShellProps) {
  const t = categoryThemes[theme];

  return (
    <div
      className={cn("relative flex min-h-screen flex-col", className)}
      style={
        {
          "--museum-accent": t.accent.color,
          "--museum-accent-soft": t.accent.soft,
          "--museum-accent-border": t.accent.border,
          "--museum-accent-glow": t.accent.glow,
        } as React.CSSProperties
      }
    >
      <AtmosphericBackground asset={t.background} frame={t.frame} priority />
      <div className="relative z-10 flex min-h-screen flex-col">
        <CategoryHeader back={back} />
        <main
          className={cn(
            "flex-1",
            dense ? "pb-6 pt-4 md:pb-8 md:pt-5" : "pb-10 pt-6 md:pb-14 md:pt-8",
          )}
        >
          <Container className={contentClassName}>{children}</Container>
        </main>
      </div>
    </div>
  );
}
