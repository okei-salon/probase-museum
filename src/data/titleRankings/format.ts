import type { TitleValueFormat } from "./defs";
import {
  formatAvgDisplay,
  formatEraDisplay,
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
    case "ip": {
      // values は 168.2 形式（.1=1/3）または小数イニング
      const whole = Math.floor(value + 1e-9);
      const frac = Math.round((value - whole) * 10);
      if (frac === 1 || frac === 2) return `${whole}.${frac}`;
      if (Math.abs(value - whole) < 1e-9) return String(whole);
      return value.toFixed(1);
    }
    case "int":
      return String(Math.round(value));
    default:
      return String(value);
  }
}
