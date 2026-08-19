import { CategoryShell, PageHeading } from "@/components/category";
import { DemoConfirmBoard } from "@/components/import/DemoConfirmBoard";

export default function ImportDemoPage() {
  return (
    <CategoryShell theme="awards" back={{ href: "/import", label: "データ取込" }}>
      <PageHeading
        title="デモデータ確認"
        subtitle="デモ取込モードで登録したテストデータのみを表示します（本番・正式ランキングには混在しません）"
        icon="file"
      />
      <DemoConfirmBoard />
    </CategoryShell>
  );
}
