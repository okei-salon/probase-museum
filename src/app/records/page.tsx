import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { recordsMenu } from "@/data/records";

export default function RecordsPage() {
  return (
    <CategoryShell theme="records" back={{ href: "/", label: "HOME" }}>
      <PageHeading
        title="RECORDS"
        subtitle="記録室 — 全シーズン横断の歴代記録"
        icon="trophy"
      />
      <LinkList items={recordsMenu} />
    </CategoryShell>
  );
}
