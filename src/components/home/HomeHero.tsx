import { Container } from "@/components/ui/Container";
import { siteMeta } from "@/data/home";

/** 添付完成デザインのヒーローを忠実再現 */
export function HomeHero() {
  return (
    <section className="relative pb-3 pt-8 md:pb-4 md:pt-12">
      <Container>
        <div className="mx-auto text-center">
          <h1 className="font-display leading-none">
            <span className="text-gold-gradient block text-[clamp(1.05rem,2.2vw,1.45rem)] tracking-[0.28em]">
              PROBASE
            </span>
            <span className="text-gold-gradient mt-1 block text-[clamp(2.35rem,5.6vw,3.65rem)] tracking-[0.16em]">
              MUSEUM
            </span>
          </h1>

          <p className="mt-3 text-[11px] tracking-[0.14em] text-museum-gold sm:mt-3.5 sm:text-xs sm:tracking-[0.16em]">
            {siteMeta.heroCaption}
          </p>
        </div>
      </Container>
    </section>
  );
}
