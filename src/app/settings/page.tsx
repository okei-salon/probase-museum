import { CategoryShell, PageHeading, DataPanel } from "@/components/category";

export default function SettingsPage() {
  return (
    <CategoryShell theme="seasons" back={{ href: "/", label: "HOME" }}>
      <PageHeading title="設定" subtitle="SETTINGS" />
      <DataPanel title="プロトタイプ">
        <p className="text-[13px] text-museum-ivory-muted">
          設定機能は未実装です。画面遷移確認用のプレースホルダーです。
        </p>
      </DataPanel>
    </CategoryShell>
  );
}
