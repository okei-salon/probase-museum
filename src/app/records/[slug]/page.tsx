import { notFound, redirect } from "next/navigation";
import {
  CategoryShell,
  DataPanel,
  PageHeading,
} from "@/components/category";
import { RecordsOtherFeatsBoard } from "@/components/records/RecordsOtherFeatsBoard";
import { InterleagueRecordsBoard } from "@/components/records/InterleagueRecordsBoard";
import { RecordsStatBoard } from "@/components/records/RecordsStatBoard";
import { RecordsStreakBoard } from "@/components/records/RecordsStreakBoard";
import {
  getRecordItem,
  recordsSlugAliases,
  resolveRecordsSlug,
} from "@/data/records";

type Props = { params: Promise<{ slug: string }> };

export default async function RecordDetailPage({ params }: Props) {
  const { slug } = await params;

  if (slug in recordsSlugAliases) {
    redirect(`/records/${resolveRecordsSlug(slug)}`);
  }

  const item = getRecordItem(slug);
  if (!item) notFound();

  return (
    <CategoryShell
      theme="records"
      back={{ href: "/records", label: "RECORDS" }}
    >
      <PageHeading
        title={item.title}
        subtitle={item.description}
        icon={item.icon}
      />
      <DataPanel title={item.title} description="歴代記録">
        {slug === "season" ? <RecordsStatBoard mode="season" /> : null}
        {slug === "career" ? <RecordsStatBoard mode="career" /> : null}
        {slug === "interleague" ? <InterleagueRecordsBoard /> : null}
        {slug === "streak" ? <RecordsStreakBoard /> : null}
        {slug === "other" ? <RecordsOtherFeatsBoard /> : null}
      </DataPanel>
    </CategoryShell>
  );
}
