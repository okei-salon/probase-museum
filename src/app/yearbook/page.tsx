import { CategoryShell, PageHeading, SelectGrid } from "@/components/category";
import { getYearbookYearItems } from "@/data/yearbook";

export default function YearbookPage() {
  return (
    <CategoryShell theme="yearbook" back={{ href: "/", label: "HOME" }}>
      <PageHeading
        title="YEARBOOK"
        subtitle="文章で残す歴史 — 年度を選ぶ"
        icon="book"
      />
      <SelectGrid items={getYearbookYearItems()} columns={2} />
    </CategoryShell>
  );
}
