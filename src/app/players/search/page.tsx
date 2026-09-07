import { CategoryShell, PageHeading } from "@/components/category";
import { PlayerNameSearchBoard } from "@/components/players/PlayerNameSearchBoard";

export default function PlayerSearchPage() {
  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title="選手名検索"
        subtitle="氏名・読みから選手を検索"
        icon="search"
      />
      <PlayerNameSearchBoard />
    </CategoryShell>
  );
}
