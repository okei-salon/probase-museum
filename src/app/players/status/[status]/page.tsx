import { notFound } from "next/navigation";
import { CategoryShell, PageHeading } from "@/components/category";

type Props = { params: Promise<{ status: string }> };

export default async function PlayerStatusListPage({ params }: Props) {
  const { status } = await params;
  if (status !== "active" && status !== "retired") notFound();

  const title = status === "active" ? "現役選手" : "引退選手";

  return (
    <CategoryShell
      theme="players"
      back={{ href: "/players/status", label: "現役／引退の絞り込み" }}
    >
      <PageHeading title={title} subtitle="選手一覧" icon="users" />
      <p className="text-[13px] text-museum-ivory-soft">
        この区分の一覧は未整備です。選手名検索または球団から検索をご利用ください。
      </p>
    </CategoryShell>
  );
}
