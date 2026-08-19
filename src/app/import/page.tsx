import { CategoryShell, PageHeading } from "@/components/category";
import { ImportWorkspace } from "@/components/import/ImportWorkspace";

export default function ImportPage() {
  return (
    <CategoryShell theme="awards" back={{ href: "/", label: "ホーム" }}>
      <PageHeading
        title="データ取込"
        subtitle="Museumのデータ登録入口。画像OCR→確認→登録で各ページへ反映します"
        icon="file"
      />
      <ImportWorkspace />
    </CategoryShell>
  );
}
