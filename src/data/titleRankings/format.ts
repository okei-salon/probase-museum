import type { TitleValueFormat } from "./defs";
import {
  formatAvgDisplay,
  formatEraDisplay,
  formatIpFromDecimalInnings,
  formatWinPctDisplay,
} from "@/lib/manualEntry/normalizeInput";

export function formatTitleValue(
  format: TitleValueFormat,
  value: number,
): string {
  switch (format) {
    case "avg":
    case "pct":
      return formatAvgDisplay(value);
    case "era":
    case "rate2":
      return formatEraDisplay(value);
    case "pct100":
      return `${(value * 100).toFixed(1)}%`;
    case "ip":
      // candidates の ip は outs/3 の小数イニング。野球表記は outs 換算で戻す。
      return formatIpFromDecimalInnings(value);
    case "int":
      return String(Math.round(value));
    default:
      return String(value);
  }
}
