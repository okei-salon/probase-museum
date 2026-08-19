import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { samplePlayers } from "@/data/players";

export default function PlayerFavoritesPage() {
  const items = samplePlayers.slice(0, 2).map((p) => ({
    id: p.id,
    href: `/players/${p.id}`,
    title: p.name,
    description: `${p.team} / ${p.position}`,
    icon: "heart" as const,
  }));

  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title="お気に入り選手"
        subtitle="登録したお気に入り選手の一覧（ダミー）"
        icon="heart"
      />
      <LinkList items={items} />
    </CategoryShell>
  );
}
