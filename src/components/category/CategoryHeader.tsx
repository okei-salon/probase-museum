import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { MuseumLogo } from "@/components/ui/MuseumLogo";
import { BackLink } from "@/components/category/BackLink";
import { AuthUserMenu } from "@/components/auth/AuthUserMenu";
import { SectionJumpMenu } from "@/components/layout/SectionJumpMenu";
import { cn } from "@/lib/cn";

type CategoryHeaderProps = {
  back?: { href: string; label: string };
};

/** カテゴリ画面用ヘッダー（戻る + セクション移動/データ取り込み/設定）。スクロール中も固定。 */
export function CategoryHeader({ back }: CategoryHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/10",
        "bg-black/78 backdrop-blur-md",
        "pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:pb-3.5",
      )}
    >
      <Container className="flex items-center justify-between gap-3">
        {back ? (
          <BackLink href={back.href} label={back.label} />
        ) : (
          <MuseumLogo size="sm" showTagline={false} />
        )}

        <nav
          aria-label="ユーティリティ"
          className="flex shrink-0 items-center gap-3 text-[12px] text-museum-ivory sm:gap-4"
        >
          <SectionJumpMenu />
          <Link href="/import" className="hover:text-museum-gold">
            <span className="hidden sm:inline">データ取り込み</span>
            <span className="sm:hidden">取込</span>
          </Link>
          <Link href="/settings" className="hover:text-museum-gold">
            設定
          </Link>
          <AuthUserMenu compact />
        </nav>
      </Container>
    </header>
  );
}
