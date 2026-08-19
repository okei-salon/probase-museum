import { CategoryShell, PageHeading, DataPanel } from "@/components/category";
import { SettingsAuthPanel } from "@/components/auth/SettingsAuthPanel";
import { MuseumBackupPanel } from "@/components/settings/MuseumBackupPanel";

export default function SettingsPage() {
  return (
    <CategoryShell theme="seasons" back={{ href: "/", label: "HOME" }}>
      <PageHeading title="設定" subtitle="SETTINGS" />
      <div className="space-y-5">
        <DataPanel
          title="データバックアップ"
          description="端末のMuseumデータをJSONで書き出し・復元（クラウド移行前の必須ステップ）"
        >
          <MuseumBackupPanel />
        </DataPanel>
        <DataPanel title="アカウント">
          <SettingsAuthPanel />
        </DataPanel>
      </div>
    </CategoryShell>
  );
}
