import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { MuseumLogo } from "@/components/ui/MuseumLogo";
import { siteMeta } from "@/data/home";

const footerLinks = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

/** 添付完成デザインのフッターを忠実再現 */
export function SiteFooter() {
  return (
    <footer className="relative z-10 pb-4 pt-2">
      <Container>
        <div className="gold-hairline mb-3 h-px w-full" />
        <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_1fr] md:items-center">
          <MuseumLogo size="sm" showTagline={false} />

          <div className="flex flex-col items-start gap-1 md:items-center">
            <nav
              aria-label="フッター"
              className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-museum-ivory-muted"
            >
              {footerLinks.map((link, index) => (
                <span key={link.href} className="inline-flex items-center gap-2.5">
                  {index > 0 ? (
                    <span className="text-museum-gold/40" aria-hidden>
                      |
                    </span>
                  ) : null}
                  <Link href={link.href} className="hover:text-museum-gold">
                    {link.label}
                  </Link>
                </span>
              ))}
            </nav>
            <p className="text-[10px] text-museum-ivory-soft">
              © {siteMeta.copyrightYear} ProBase Museum. All Rights Reserved.
            </p>
          </div>

          <div className="space-y-0.5 text-[10px] text-museum-ivory-soft md:text-right">
            <p>データ最終更新日：{siteMeta.dataUpdatedAt}</p>
            <p>データ対象：{siteMeta.dataCoverage}</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
