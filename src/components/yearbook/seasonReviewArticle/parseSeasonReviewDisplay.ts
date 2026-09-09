/**
 * シーズン総評の表示用パーサ（読み取り専用）。
 * 保存テキストは変更せず、表示トークンへ分解するだけ。
 */

export type SeasonReviewInlinePart =
  | { kind: "text"; text: string }
  | { kind: "player"; text: string }
  | { kind: "stat"; text: string }
  | { kind: "nickname"; text: string };

export type SeasonReviewDisplayBlock =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "heading"; parts: SeasonReviewInlinePart[] }
  | { type: "paragraph"; parts: SeasonReviewInlinePart[] }
  | { type: "blank" };

/**
 * 選手・チームの成績値として提示されている数字のみ。
 * 年号・月・試合数・順位・「第N戦」などは除外する。
 * 打率・出塁率・OPS など率も、本塁打・打点などと同じくシアン対象。
 */
const IMPORTANT_STAT_RE =
  /(?:得点圏打率[.．]?\d{3}|打率[.．]?\d{3}|出塁率[.．]?\d{3}|長打率[.．]?\d{3}|被打率[.．]?\d{3}|勝率[.．]?\d{3}|OPS[.．]?(?:\d\.\d{2,3}|\d{3})|防御率\d+(?:\.\d+)?|WHIP\d+(?:\.\d+)?|\d+本塁打(?:[・･]\d+盗塁)?|\d+打点|\d+盗塁|\d+得点|\d+安打|\d+勝(?!\d)|\d+セーブ|\d+ホールド|\d+奪三振)/gi;

const NICKNAME_RE = /【[^】\n]{1,40}】/g;

const SUBTITLE_RE = /^[―—–\-－]{1,2}.+[―—–\-－]{1,2}$/;

function isSubtitleLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (SUBTITLE_RE.test(t)) return true;
  if (/^[「『].+[」』]$/.test(t) && t.length <= 48) return true;
  return false;
}

function isTitleLine(line: string, hasFollowingSubtitle: boolean): boolean {
  const t = line.trim();
  if (!t || t.length > 56) return false;
  if (/総評/.test(t)) return true;
  if (hasFollowingSubtitle && t.length <= 40) return true;
  if (/^\d{4}\s*(BLUE|RED)?/.test(t) && t.length <= 40) return true;
  return false;
}

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 2 || t.length > 42) return false;
  if (/[。．！？!?]$/.test(t)) return false;
  if (/^【.+】$/.test(t)) return false;
  // 数字だけの行や「第N節」などは見出しにしない
  if (/^[\d.\s]+$/.test(t)) return false;
  if (/^\d{4}年/.test(t)) return false;
  // 文の途中っぽい長い読点連続は段落扱い
  if ((t.match(/、/g) ?? []).length >= 2) return false;
  return true;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPlayerNameList(names: readonly string[]): string[] {
  const set = new Set<string>();
  for (const raw of names) {
    const n = raw.trim();
    if (n.length < 2) continue;
    // 汎用すぎる1〜2文字は誤爆しやすいので、漢字1文字は除外済み（len>=2）
    // 「佐藤」のみ等の短い名字は fullName が長い場合はそちら優先
    set.add(n);
  }
  return [...set].sort((a, b) => b.length - a.length || a.localeCompare(b, "ja"));
}

type Span = {
  start: number;
  end: number;
  kind: "player" | "stat" | "nickname";
  text: string;
};

function collectSpans(line: string, playerNames: string[]): Span[] {
  const spans: Span[] = [];

  for (const m of line.matchAll(NICKNAME_RE)) {
    if (m.index == null) continue;
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      kind: "nickname",
      text: m[0],
    });
  }

  for (const name of playerNames) {
    if (!name) continue;
    const re = new RegExp(escapeRegExp(name), "g");
    for (const m of line.matchAll(re)) {
      if (m.index == null) continue;
      spans.push({
        start: m.index,
        end: m.index + name.length,
        kind: "player",
        text: name,
      });
    }
  }

  for (const m of line.matchAll(IMPORTANT_STAT_RE)) {
    if (m.index == null) continue;
    const text = m[0];
    // 「2026勝」のような誤爆を避ける（年の直後の勝は稀だが、4桁勝は除外）
    if (/^\d{4}勝$/.test(text)) continue;
    spans.push({
      start: m.index,
      end: m.index + text.length,
      kind: "stat",
      text,
    });
  }

  // 重なり解消: 開始位置昇順、長い方優先、nickname > player > stat
  const priority = { nickname: 3, player: 2, stat: 1 } as const;
  spans.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const len = b.end - b.start - (a.end - a.start);
    if (len !== 0) return len;
    return priority[b.kind] - priority[a.kind];
  });

  const picked: Span[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    picked.push(s);
    cursor = s.end;
  }
  return picked;
}

function tokenizeInline(
  line: string,
  playerNames: string[],
): SeasonReviewInlinePart[] {
  if (!line) return [{ kind: "text", text: "" }];
  const spans = collectSpans(line, playerNames);
  if (spans.length === 0) return [{ kind: "text", text: line }];

  const parts: SeasonReviewInlinePart[] = [];
  let i = 0;
  for (const s of spans) {
    if (s.start > i) {
      parts.push({ kind: "text", text: line.slice(i, s.start) });
    }
    parts.push({ kind: s.kind, text: s.text });
    i = s.end;
  }
  if (i < line.length) {
    parts.push({ kind: "text", text: line.slice(i) });
  }
  return parts;
}

/**
 * 表示用ブロックへ分解。原文の文字は欠落させない（blank は空行）。
 */
export function parseSeasonReviewDisplay(
  raw: string,
  playerNames: readonly string[] = [],
): SeasonReviewDisplayBlock[] {
  const names = buildPlayerNameList(playerNames);
  // 末尾改行は維持しつつ行分割
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: SeasonReviewDisplayBlock[] = [];

  let i = 0;
  // 冒頭タイトル／サブタイトル
  while (i < lines.length && lines[i]!.trim() === "") {
    blocks.push({ type: "blank" });
    i += 1;
  }
  if (i < lines.length) {
    const first = lines[i]!;
    let j = i + 1;
    while (j < lines.length && lines[j]!.trim() === "") j += 1;
    const second = j < lines.length ? lines[j]! : "";
    const secondIsSub = second ? isSubtitleLine(second) : false;
    if (isTitleLine(first, secondIsSub)) {
      blocks.push({ type: "title", text: first });
      i += 1;
      while (i < lines.length && lines[i]!.trim() === "") {
        blocks.push({ type: "blank" });
        i += 1;
      }
      if (i < lines.length && isSubtitleLine(lines[i]!)) {
        blocks.push({ type: "subtitle", text: lines[i]! });
        i += 1;
      }
    }
  }

  for (; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.trim() === "") {
      blocks.push({ type: "blank" });
      continue;
    }
    const parts = tokenizeInline(line, names);
    if (isHeadingLine(line)) {
      blocks.push({ type: "heading", parts });
    } else {
      blocks.push({ type: "paragraph", parts });
    }
  }

  return blocks;
}

/** 原文復元（欠落検証用） */
export function reconstructSeasonReviewText(
  blocks: SeasonReviewDisplayBlock[],
): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.type === "blank") {
      lines.push("");
      continue;
    }
    if (b.type === "title" || b.type === "subtitle") {
      lines.push(b.text);
      continue;
    }
    lines.push(b.parts.map((p) => p.text).join(""));
  }
  return lines.join("\n");
}
