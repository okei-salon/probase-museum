import { CategoryShell, PageHeading } from "@/components/category";
import { SeasonsWorldGrid } from "@/components/seasons";

export default function SeasonsPage() {
  return (
    <CategoryShell theme="seasons" back={{ href: "/", label: "HOME" }}>
      <PageHeading
        title="SEASONS"
        subtitle="シーズン一覧 · BLUE / RED"
      />
      <p className="mb-5 -mt-2 max-w-2xl text-[12px] leading-relaxed text-museum-ivory-soft md:text-[13px]">
        同じ年度でも BLUE と RED は独立したシーズン世界です。正式運用は 2026
        年から。各ワールドの年度を選んでください。
      </p>
      <SeasonsWorldGrid />
    </CategoryShell>
  );
}
