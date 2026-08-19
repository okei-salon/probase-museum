import { CategoryShell, LinkList, PageHeading } from "@/components/category";
import { playersTopMenu } from "@/data/players";

export default function PlayersPage() {
  return (
    <CategoryShell theme="players" back={{ href: "/", label: "HOME" }}>
      <PageHeading title="PLAYERS" subtitle="選手名鑑" icon="user" />
      <LinkList items={playersTopMenu} />
    </CategoryShell>
  );
}
