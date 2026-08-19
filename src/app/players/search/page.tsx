import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { samplePlayers } from "@/data/players";

export default function PlayerSearchPage() {
  const items = samplePlayers.map((p) => ({
    id: p.id,
    href: `/players/${p.id}`,
    title: p.name,
    description: `${p.team} / ${p.position}`,
    icon: "user" as const,
  }));

  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title="選手名検索"
        subtitle="氏名・読みから選手を検索（ダミー一覧）"
        icon="search"
      />
      <LinkList items={items} />
    </CategoryShell>
  );
}
