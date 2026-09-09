/**
 * Museum 内の閲覧履歴（タブ単位・sessionStorage）。
 * 左上「戻る」を固定親ページではなく、実際の直前画面へ戻すために使う。
 * 保存データ・YEAR/WORLD ロジックには触れない。
 */

const STORAGE_KEY = "probase-museum.nav-history.v1";
const MAX_ENTRIES = 50;

export function isMuseumAppPath(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  if (pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/_next")) return false;
  return true;
}

export function museumLocationKey(pathname: string, search = ""): string {
  const q = search.startsWith("?")
    ? search.slice(1)
    : search.replace(/^\?/, "");
  return q ? `${pathname}?${q}` : pathname;
}

export function readMuseumNavStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is string => typeof x === "string" && x.startsWith("/"),
    );
  } catch {
    return [];
  }
}

function writeMuseumNavStack(stack: string[]): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stack.slice(-MAX_ENTRIES)),
    );
  } catch {
    // quota / private mode
  }
}

/**
 * 現在地をスタックへ同期する。
 * - 前進: push
 * - ブラウザ戻る／同一履歴への再訪: 途中まで truncate（ループ防止）
 */
export function syncMuseumNavHistory(locationKey: string): void {
  const pathOnly = locationKey.split("?")[0] ?? locationKey;
  if (!isMuseumAppPath(pathOnly)) return;

  const stack = readMuseumNavStack();
  const top = stack[stack.length - 1];
  if (top === locationKey) return;

  const existingIdx = stack.lastIndexOf(locationKey);
  if (existingIdx >= 0) {
    writeMuseumNavStack(stack.slice(0, existingIdx + 1));
    return;
  }

  stack.push(locationKey);
  writeMuseumNavStack(stack);
}

/** アプリ内で戻れる直前の画面があるか */
export function canMuseumGoBack(): boolean {
  return readMuseumNavStack().length >= 2;
}

export function peekMuseumPreviousLocation(): string | null {
  const stack = readMuseumNavStack();
  if (stack.length < 2) return null;
  return stack[stack.length - 2] ?? null;
}
