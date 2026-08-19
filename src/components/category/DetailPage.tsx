import type { ReactNode } from "react";
import { CategoryShell } from "@/components/category/CategoryShell";
import { DataPanel } from "@/components/category/DataPanel";
import { DummyTable } from "@/components/category/DummyTable";
import { PageHeading } from "@/components/category/PageHeading";
import type { CategoryThemeId } from "@/config/categoryThemes";
import type { MuseumIconName } from "@/components/ui/MuseumIcon";

type DetailPageProps = {
  theme: CategoryThemeId;
  back: { href: string; label: string };
  title: string;
  subtitle?: string;
  icon?: MuseumIconName;
  iconClassName?: string;
  panelTitle?: string;
  panelDescription?: string;
  body?: string;
  /** 表・文章以外のカスタムコンテンツ（年度成績パネルなど） */
  children?: ReactNode;
  headers?: string[];
  rows?: string[][];
};

/** 詳細画面の共通テンプレート（ダミー表 / 文章 / children） */
export function DetailPage({
  theme,
  back,
  title,
  subtitle,
  icon,
  iconClassName,
  panelTitle,
  panelDescription,
  body,
  children,
  headers,
  rows,
}: DetailPageProps) {
  const hasCustom = Boolean(children);
  const hasTable = Boolean(headers && rows);
  const hasBody = Boolean(body);

  return (
    <CategoryShell theme={theme} back={back}>
      <PageHeading
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconClassName={iconClassName}
      />
      <DataPanel title={panelTitle} description={panelDescription}>
        {hasBody ? (
          <p className="text-[13px] leading-relaxed text-museum-ivory-muted md:text-sm">
            {body}
          </p>
        ) : null}
        {hasCustom ? (
          <div className={hasBody ? "mt-4" : undefined}>{children}</div>
        ) : null}
        {hasTable ? (
          <DummyTable
            headers={headers!}
            rows={rows!}
            className={hasBody || hasCustom ? "mt-4" : undefined}
          />
        ) : null}
        {!hasBody && !hasTable && !hasCustom ? (
          <p className="text-[13px] text-museum-ivory-soft">
            ダミーデータ準備中です。正式データは後日接続します。
          </p>
        ) : null}
      </DataPanel>
    </CategoryShell>
  );
}
