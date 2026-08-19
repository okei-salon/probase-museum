/** OCR誤認識向けの軽い類似判定（自動確定には使わない） */

export function normalizePlayerToken(name: string): string {
  return name.trim().replace(/\s+/g, "");
}

export function levenshtein(a: string, b: string): number {
  const s = normalizePlayerToken(a);
  const t = normalizePlayerToken(b);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const prev = new Array<number>(t.length + 1);
  const curr = new Array<number>(t.length + 1);
  for (let j = 0; j <= t.length; j += 1) prev[j] = j;

  for (let i = 1; i <= s.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= t.length; j += 1) prev[j] = curr[j];
  }
  return prev[t.length];
}

/** 0〜1。1が完全一致。自動確定閾値には使わず候補提示のみ。 */
export function nameSimilarity(a: string, b: string): number {
  const s = normalizePlayerToken(a);
  const t = normalizePlayerToken(b);
  if (!s || !t) return 0;
  if (s === t) return 1;
  const dist = levenshtein(s, t);
  const maxLen = Math.max(s.length, t.length);
  return Math.max(0, 1 - dist / maxLen);
}

export function isFuzzyNameCandidate(ocrName: string, known: string): boolean {
  const s = normalizePlayerToken(ocrName);
  const t = normalizePlayerToken(known);
  if (!s || !t) return false;
  if (s === t) return true;
  // 短い名字は1文字差まで、長い場合は類似度0.6以上
  if (Math.max(s.length, t.length) <= 3) {
    return levenshtein(s, t) === 1;
  }
  return nameSimilarity(s, t) >= 0.6;
}
