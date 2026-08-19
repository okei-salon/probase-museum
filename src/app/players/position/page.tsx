import { CategoryShell, LinkList, PageHeading } from "@/components/category";

export default function PlayerPositionPage() {
  const items = [
    {
      id: "batters",
      href: "/players/position/batters",
      title: "野手",
      description: "捕手・内野手・外野手",
      icon: "baseball" as const,
    },
    {
      id: "pitchers",
      href: "/players/position/pitchers",
      title: "投手",
      description: "先発・救援",
      icon: "star" as const,
    },
  ];

  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title="野手／投手の絞り込み"
        subtitle="ポジション区分で選手を絞り込む"
        icon="baseball"
      />
      <LinkList items={items} />
    </CategoryShell>
  );
}
