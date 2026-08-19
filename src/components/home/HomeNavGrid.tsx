import { Container } from "@/components/ui/Container";
import { MenuCard } from "@/components/ui/MenuCard";
import { media } from "@/config/media";
import { navCards } from "@/data/home";

/** 添付完成デザインの6カード横並びを忠実再現 */
export function HomeNavGrid() {
  return (
    <section aria-label="メインメニュー" className="pb-3 md:pb-3.5">
      <Container>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2">
          {navCards.map((card) => (
            <MenuCard
              key={card.id}
              href={card.href}
              titleEn={card.titleEn}
              titleJa={card.titleJa}
              description={card.description}
              icon={card.icon}
              image={media.nav[card.mediaKey]}
              tone={card.tone}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
