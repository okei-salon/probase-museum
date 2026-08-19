import { HomeDataImportEntry } from "@/components/home/HomeDataImportEntry";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeNavGrid } from "@/components/home/HomeNavGrid";
import { PageShell } from "@/components/layout/PageShell";
import { media } from "@/config/media";

export default function HomePage() {
  return (
    <PageShell background={media.backgrounds.home}>
      <HomeHero />
      <HomeNavGrid />
      <HomeDataImportEntry />
    </PageShell>
  );
}
