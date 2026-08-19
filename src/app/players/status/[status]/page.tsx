import { notFound } from "next/navigation";
import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { samplePlayers } from "@/data/players";

type Props = { params: Promise<{ status: string }> };

export default async function PlayerStatusListPage({ params }: Props) {
  const { status } = await params;
  if (status !== "active" && status !== "retired") notFound();

  const title = status === "active" ? "現役選手" : "引退選手";
  const items = samplePlayers.map((p) => ({
    id: p.id,
    href: `/players/${p.id}`,
    title: p.name,
    description: `${p.team} / ${p.position}`,
    icon: "user" as const,
  }));

  return (
    <CategoryShell
      theme="players"
      back={{ href: "/players/status", label: "現役／引退の絞り込み" }}
    >
      <PageHeading title={title} subtitle="ダミー一覧" icon="users" />
      <LinkList items={items} />
    </CategoryShell>
  );
}
