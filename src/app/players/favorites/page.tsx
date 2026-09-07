import { CategoryShell, PageHeading } from "@/components/category";

export default function PlayerFavoritesPage() {
  return (
    <CategoryShell theme="players" back={{ href: "/players", label: "PLAYERS" }}>
      <PageHeading
        title="お気に入り選手"
        subtitle="登録したお気に入り選手の一覧"
        icon="heart"
      />
      <p className="text-[13px] text-museum-ivory-soft">
        お気に入り選手はまだ登録されていません。選手名検索または球団から検索で選手ページを開けます。
      </p>
    </CategoryShell>
  );
}
