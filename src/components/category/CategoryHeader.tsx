import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { MuseumLogo } from "@/components/ui/MuseumLogo";
import { BackLink } from "@/components/category/BackLink";
import { AuthUserMenu } from "@/components/auth/AuthUserMenu";

type CategoryHeaderProps = {
  back?: { href: string; label: string };
};

/** カテゴリ画面用ヘッダー（ロゴ or 戻る + お知らせ/データ取り込み/設定） */
export function CategoryHeader({ back }: CategoryHeaderProps) {
  return (
    <header className="relative z-30 pt-4 md:pt-5">
      <Container className="flex items-center justify-between gap-3">
        {back ? (
          <BackLink href={back.href} label={back.label} />
        ) : (
          <MuseumLogo size="sm" showTagline={false} />
        )}

        <nav
          aria-label="ユーティリティ"
          className="flex shrink-0 items-center gap-4 text-[12px] text-museum-ivory"
        >
          <Link href="/news" className="hover:text-museum-gold">
            お知らせ
          </Link>
          <Link href="/import" className="hover:text-museum-gold">
            データ取り込み
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
