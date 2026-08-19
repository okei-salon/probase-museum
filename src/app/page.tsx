import { HomeDataImportEntry } from "@/components/home/HomeDataImportEntry";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeNavGrid } from "@/components/home/HomeNavGrid";
import { PageShell } from "@/components/layout/PageShell";
import { media } from "@/config/media";
import { requireMuseumAccess } from "@/lib/auth";

export default async function HomePage() {
  await requireMuseumAccess();

  return (
    <PageShell background={media.backgrounds.home}>
      <HomeHero />
      <HomeNavGrid />
      <HomeDataImportEntry />
    </PageShell>
  );
}
