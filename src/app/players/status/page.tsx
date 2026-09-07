import { CategoryShell, LinkList, PageHeading } from "@/components/category";

export default function PlayerStatusPage() {
  const items = [
    {
      id: "active",
      href: "/players/status/active",
      title: "現役選手",
      description: "現役登録の選手一覧",
      icon: "users" as const,
    },
    {
      id: "retired",
      href: "/players/status/retired",
      title: "引退選手",
      description: "引退した選手一覧",
      icon: "user" as const,
    },
  ];

  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title="現役／引退の絞り込み"
        subtitle="現役選手と引退選手を切り替えて表示"
        icon="users"
      />
      <LinkList items={items} />
    </CategoryShell>
  );
}
