import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { samplePlayers } from "@/data/players";

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
      <p className="mt-4 text-[11px] text-museum-ivory-soft">
        参考ダミー選手: {samplePlayers.map((p) => p.name).join(" / ")}
      </p>
    </CategoryShell>
  );
}
