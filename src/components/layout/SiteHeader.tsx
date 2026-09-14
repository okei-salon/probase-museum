import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MuseumIcon } from "@/components/ui/MuseumIcon";
import { MuseumLogo } from "@/components/ui/MuseumLogo";
import { AuthUserMenu } from "@/components/auth/AuthUserMenu";
import { SectionJumpMenu } from "@/components/layout/SectionJumpMenu";
import { cn } from "@/lib/cn";

/** ホーム用ヘッダー。スクロール中も固定し、セクション移動を常時操作可能にする。 */
export function SiteHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/10",
        "bg-black/78 backdrop-blur-md",
        "pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:pb-3.5",
      )}
    >
      <Container className="flex items-start justify-between gap-3">
        <MuseumLogo />

        <nav
          aria-label="ユーティリティ"
          className="flex shrink-0 items-center gap-1.5 sm:gap-2"
        >
          <SectionJumpMenu variant="button" />
          <Button
            variant="ghost"
            size="sm"
            href="/import"
            className="h-8 rounded-md border-white/25 bg-black/55 px-2.5 text-[11px] text-museum-ivory"
          >
            <MuseumIcon name="file" size={13} className="text-museum-ivory" />
            <span className="hidden sm:inline">データ取り込み</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            href="/settings"
            className="h-8 rounded-md border-white/25 bg-black/55 px-2.5 text-[11px] text-museum-ivory"
          >
            <MuseumIcon
              name="settings"
              size={13}
              className="text-museum-ivory"
            />
            <span className="hidden sm:inline">設定</span>
          </Button>
          <AuthUserMenu />
        </nav>
      </Container>
    </header>
  );
}
