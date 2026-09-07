import { notFound } from "next/navigation";
import { CategoryShell, PageHeading } from "@/components/category";

type Props = { params: Promise<{ role: string }> };

export default async function PlayerRoleListPage({ params }: Props) {
  const { role } = await params;
  if (role !== "batters" && role !== "pitchers") notFound();

  const title = role === "batters" ? "野手" : "投手";

  return (
    <CategoryShell
      theme="players"
      back={{ href: "/players/position", label: "野手／投手の絞り込み" }}
    >
      <PageHeading title={title} subtitle="選手一覧" icon="baseball" />
      <p className="text-[13px] text-museum-ivory-soft">
        ポジション別の横断一覧は未整備です。球団から検索で守備位置ごとに選手を確認できます。
      </p>
    </CategoryShell>
  );
}
