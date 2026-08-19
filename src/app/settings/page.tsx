import { CategoryShell, PageHeading, DataPanel } from "@/components/category";
import { SettingsAuthPanel } from "@/components/auth/SettingsAuthPanel";

export default function SettingsPage() {
  return (
    <CategoryShell theme="seasons" back={{ href: "/", label: "HOME" }}>
      <PageHeading title="設定" subtitle="SETTINGS" />
      <DataPanel title="アカウント">
        <SettingsAuthPanel />
      </DataPanel>
    </CategoryShell>
  );
}
