import { notFound } from "next/navigation";
import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { samplePlayers } from "@/data/players";

type Props = { params: Promise<{ role: string }> };

export default async function PlayerRoleListPage({ params }: Props) {
  const { role } = await params;
  if (role !== "batters" && role !== "pitchers") notFound();

  const title = role === "batters" ? "野手" : "投手";
  const filtered =
    role === "batters"
      ? samplePlayers.filter((p) => p.position !== "投手")
      : samplePlayers.filter((p) => p.position === "投手");

  const items = (filtered.length ? filtered : samplePlayers).map((p) => ({
    id: p.id,
    href: `/players/${p.id}`,
    title: p.name,
    description: `${p.team} / ${p.position}`,
    icon: "user" as const,
  }));

  return (
    <CategoryShell
      theme="players"
      back={{ href: "/players/position", label: "野手／投手の絞り込み" }}
    >
      <PageHeading title={title} subtitle="ダミー一覧" icon="baseball" />
      <LinkList items={items} />
    </CategoryShell>
  );
}
