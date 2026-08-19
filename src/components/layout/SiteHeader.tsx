import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MuseumIcon } from "@/components/ui/MuseumIcon";
import { MuseumLogo } from "@/components/ui/MuseumLogo";

/** 添付完成デザインのヘッダーを忠実再現 */
export function SiteHeader() {
  return (
    <header className="relative z-30 pt-4 md:pt-5">
      <Container className="flex items-start justify-between gap-3">
        <MuseumLogo />

        <nav
          aria-label="ユーティリティ"
          className="flex shrink-0 items-center gap-1.5 sm:gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 rounded-md border-white/25 bg-black/55 px-2.5 text-[11px] text-museum-ivory"
          >
            <MuseumIcon name="bell" size={13} className="text-museum-ivory" />
            <span className="hidden sm:inline">お知らせ</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 rounded-md border-white/25 bg-black/55 px-2.5 text-[11px] text-museum-ivory"
          >
            <MuseumIcon
              name="settings"
              size={13}
              className="text-museum-ivory"
            />
            <span className="hidden sm:inline">設定</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-9 gap-2 rounded-md border-white/25 bg-black/55 px-2.5 text-[11px] text-museum-ivory"
          >
            <MuseumIcon
              name="userRound"
              size={13}
              className="text-museum-ivory"
            />
            <span className="hidden flex-col items-start leading-tight sm:inline-flex">
              <span>ログイン中</span>
              <span className="text-[9px] text-museum-ivory-soft">
                管理者モード
              </span>
            </span>
            <span className="sm:hidden">ログイン中</span>
            <MuseumIcon
              name="chevronDown"
              size={12}
              className="text-museum-ivory"
            />
          </Button>
        </nav>
      </Container>
    </header>
  );
}
