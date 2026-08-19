import { notFound, redirect } from "next/navigation";
import {
  SeasonItemDetail,
  type LinkListItemData,
} from "@/components/category";
import { AwardDetailPage } from "@/components/awards";
import {
  awardsMenu,
  interleagueItemAliases,
  interleagueMenu,
  parseSeasonKey,
  pennantItemAliases,
  pennantMenu,
  PENNANT_PLAYERS_REDIRECT_ITEM,
  seasonHubThemeId,
} from "@/data/seasons";
import { isAwardPageId } from "@/data/awards";

type Props = {
  params: Promise<{ seasonKey: string; section: string; item: string }>;
};

export default async function SeasonItemPage({ params }: Props) {
  const { seasonKey: raw, section, item } = await params;
  const identity = parseSeasonKey(raw);
  if (!identity) notFound();

  const { seasonKey, year } = identity;
  const yearStr = String(year);
  const hubTheme = seasonHubThemeId(identity);

  if (section === "postseason") {
    redirect(`/seasons/${seasonKey}/postseason`);
  }

  if (section === "pennant" && item === PENNANT_PLAYERS_REDIRECT_ITEM) {
    redirect(`/seasons/${seasonKey}/stats`);
  }

  if (section === "pennant" || section === "interleague") {
    const menus: Record<string, LinkListItemData[]> = {
      pennant: pennantMenu(seasonKey),
      interleague: interleagueMenu(seasonKey),
    };
    const aliases =
      section === "pennant" ? pennantItemAliases : interleagueItemAliases;
    const resolvedItem = aliases[item] ?? item;
    const current = menus[section]?.find((m) => m.id === resolvedItem);
    if (!current) notFound();

    return (
      <SeasonItemDetail
        seasonKey={seasonKey}
        year={yearStr}
        section={section}
        item={resolvedItem}
        title={current.title}
        subtitle={
          identity.world
            ? `${current.description} · ${identity.year} ${identity.world}`
            : current.description
        }
        icon={current.icon}
        iconClassName={current.iconClassName}
      />
    );
  }

  if (section === "awards") {
    const current = awardsMenu(seasonKey).find((m) => m.id === item);
    if (!current || !isAwardPageId(item)) notFound();

    return (
      <AwardDetailPage
        seasonKey={seasonKey}
        year={yearStr}
        awardId={item}
        title={current.title}
        subtitle={current.description}
        theme={hubTheme}
      />
    );
  }

  notFound();
}
