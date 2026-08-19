import type { ImportScreenType } from "@/data/import/types";

/** OCRテキストから画面種類を推定（ノイズ耐性あり） */
export function detectScreenType(text: string): ImportScreenType {
  const t = text.replace(/\s+/g, "");
  if (
    t.includes("月間") ||
    t.includes("MVP") ||
    t.includes("ＭＶＰ") ||
    ((t.includes("投手") || t.includes("野手")) &&
      (t.includes("部門") || t.includes("防御") || t.includes("打率")) &&
      /[4-9]月/.test(text))
  ) {
    // 月間っぽい語が強い場合は monthly_mvp
    if (
      t.includes("月間") ||
      (t.includes("投手") && t.includes("野手")) ||
      (t.includes("防御") && t.includes("打率"))
    ) {
      return "monthly_mvp";
    }
  }
  if (t.includes("ベストナイン")) return "best9";
  if (t.includes("ゴールデングラブ") || t.includes("GG賞")) return "gg";
  if (t.includes("沢村賞")) return "sawamura";
  if (t.includes("新人王")) return "rookie";
  if (t.includes("MVP") && !t.includes("月間")) return "mvp";
  if (t.includes("順位表") || (t.includes("勝率") && t.includes("順位"))) {
    return "standings";
  }
  if (t.includes("クライマックス") || t.includes("日本シリーズ")) {
    return "postseason";
  }
  if (t.includes("交流戦")) return "interleague";
  return "unknown";
}
