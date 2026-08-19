import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { sopMenu } from "@/data/sopMenu";

export default function SopPage() {
  return (
    <CategoryShell theme="sop" back={{ href: "/", label: "HOME" }}>
      <PageHeading
        title="SOP"
        subtitle="独自評価ランキング"
        icon="star"
        iconClassName="text-sky-300"
      />
      <LinkList items={sopMenu} />
    </CategoryShell>
  );
}
