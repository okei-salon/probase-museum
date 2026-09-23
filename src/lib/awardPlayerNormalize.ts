/**
 * 表彰プレイヤー照合用の名前正規化。
 * 前後空白・連続空白・全角英数を半角へ（NFKC）。
 */

export function normalizeAwardPlayerKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

export function isRealAwardPlayerName(name: string): boolean {
  const n = normalizeAwardPlayerKey(name);
  return Boolean(n) && n !== "未登録" && !n.includes("登録待ち") && n !== "該当なし";
}

/**
 * 選手照合:
 * - 双方に playerId があり一致 → 同一（名前欠落の過去データも可）
 * - 正規化名が一致 → 同一（移籍・ID欠落・表記差）
 * ID が両方あり不一致でも、正規化名が一致すれば同一（誤解決や再登録に耐える）
 */
export function sameAwardPlayer(
  a: { playerId?: string | null; playerName: string },
  b: { playerId?: string | null; playerName: string },
): boolean {
  const idA = (a.playerId ?? "").trim();
  const idB = (b.playerId ?? "").trim();
  if (idA && idB && idA === idB) return true;

  if (!isRealAwardPlayerName(a.playerName) || !isRealAwardPlayerName(b.playerName)) {
    return false;
  }
  return (
    normalizeAwardPlayerKey(a.playerName) === normalizeAwardPlayerKey(b.playerName)
  );
}
