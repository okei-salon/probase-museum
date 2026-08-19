/**
 * 受賞履歴テキスト（過去データから自動判定）
 * 例: 初受賞 / 2年連続2回目 / 3年ぶり2回目 / 2か月連続2回目
 */

export type YearMonth = { year: number; month: number };

/** 年度表彰（MVP・ベストナイン等） */
export function formatSeasonAwardHistory(
  winYears: number[],
  currentYear: number,
): string {
  const years = [...new Set(winYears.filter((y) => y <= currentYear))].sort(
    (a, b) => a - b,
  );
  if (!years.includes(currentYear)) {
    years.push(currentYear);
    years.sort((a, b) => a - b);
  }
  const times = years.length;
  if (times <= 1) return "初受賞";

  let streak = 1;
  for (let y = currentYear - 1; ; y -= 1) {
    if (years.includes(y)) streak += 1;
    else break;
  }

  if (streak >= 2) {
    return `${streak}年連続${times}回目`;
  }

  const prev = [...years].reverse().find((y) => y < currentYear);
  if (prev == null) return `${times}回目`;
  const gap = currentYear - prev;
  return `${gap}年ぶり${times}回目`;
}

/** 月間MVP用 */
export function formatMonthlyAwardHistory(
  wins: YearMonth[],
  current: YearMonth,
): string {
  const key = (w: YearMonth) => w.year * 12 + w.month;
  const list = [
    ...wins.filter(
      (w) =>
        w.year < current.year ||
        (w.year === current.year && w.month <= current.month),
    ),
  ];
  if (!list.some((w) => w.year === current.year && w.month === current.month)) {
    list.push(current);
  }
  list.sort((a, b) => key(a) - key(b));

  const times = list.length;
  if (times <= 1) return "初受賞";

  const cur = key(current);
  let streak = 1;
  for (let i = list.length - 2; i >= 0; i -= 1) {
    if (key(list[i]) === cur - streak) streak += 1;
    else break;
  }

  if (streak >= 2) {
    return `${streak}か月連続${times}回目`;
  }

  const prev = list[list.length - 2];
  const yearGap = current.year - prev.year;
  if (yearGap >= 1) {
    return `${yearGap}年ぶり${times}回目`;
  }
  const monthGap = current.month - prev.month;
  return `${monthGap}か月ぶり${times}回目`;
}
