"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import type {
  OcrPlayerObservation,
  PlayerMatchCandidate,
  PlayerMaster,
} from "@/data/playerMaster/types";
import {
  confirmExistingPlayer,
  registerNewPlayer,
} from "@/lib/playerMaster/learn";
import { matchPlayerFromGameDisplay } from "@/lib/playerMaster/match";

type ConfirmChoice =
  | { type: "existing"; playerId: string }
  | { type: "new" };

type PlayerIdentityConfirmProps = {
  observation: OcrPlayerObservation;
  /** 事前に得た候補。省略時は再照合 */
  candidates?: PlayerMatchCandidate[];
  className?: string;
  onResolved?: (player: PlayerMaster) => void;
  onCancel?: () => void;
};

/**
 * 未登録／曖昧なときだけ出す小さな確認UI。
 * 自動照合できた場合は呼び出さない想定。
 */
export function PlayerIdentityConfirm({
  observation,
  candidates: candidatesProp,
  className,
  onResolved,
  onCancel,
}: PlayerIdentityConfirmProps) {
  const [choice, setChoice] = useState<ConfirmChoice | null>(null);
  const [fullName, setFullName] = useState("");
  const [isRealPlayer, setIsRealPlayer] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydratePlayerMasterFromStorage();
  }, []);

  const candidates = useMemo(() => {
    if (candidatesProp) return candidatesProp;
    const result = matchPlayerFromGameDisplay(observation);
    if (result.status === "ambiguous") return result.candidates;
    if (result.status === "unknown") return result.fuzzyCandidates;
    return [];
  }, [candidatesProp, observation]);

  function handleSubmit() {
    setError(null);
    try {
      if (!choice) {
        setError("候補を選択してください");
        return;
      }
      if (choice.type === "existing") {
        const learned = confirmExistingPlayer({
          playerId: choice.playerId,
          observation,
          learnOcrAsAlias: true,
        });
        onResolved?.(learned.player);
        return;
      }
      if (!fullName.trim()) {
        setError("フルネームを入力してください");
        return;
      }
      const created = registerNewPlayer({
        fullName: fullName.trim(),
        observation,
        isRealPlayer,
      });
      onResolved?.(created.player);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/70 p-4 text-[13px] text-museum-ivory",
        className,
      )}
    >
      <h2 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
        選手を確認
      </h2>

      <dl className="mt-3 grid gap-1.5 text-[12px]">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-white/55">ゲーム表示</dt>
          <dd>{observation.gameDisplayName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-white/55">球団</dt>
          <dd>{observation.team || "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-white/55">ポジション</dt>
          <dd>{observation.position || "—"}</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] tracking-[0.08em] text-white/55">
        候補を選択してください
      </p>
      <div className="mt-2 space-y-2">
        {candidates.map((c) => (
          <label
            key={c.player.playerId}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2",
              choice?.type === "existing" &&
                choice.playerId === c.player.playerId
                ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/10"
                : "border-white/15 bg-black/40",
            )}
          >
            <input
              type="radio"
              name="player-confirm"
              className="mt-1"
              checked={
                choice?.type === "existing" &&
                choice.playerId === c.player.playerId
              }
              onChange={() => {
                setChoice({ type: "existing", playerId: c.player.playerId });
                setFullName(c.player.fullName);
              }}
            />
            <span>
              <span className="font-medium text-white">{c.player.fullName}</span>
              <span className="mt-0.5 block text-[11px] text-white/55">
                {c.matchKind === "fuzzy" ? "類似候補（要確認）" : "候補"}
                {" · "}
                {c.player.position}
              </span>
            </span>
          </label>
        ))}

        <label
          className={cn(
            "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2",
            choice?.type === "new"
              ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/10"
              : "border-white/15 bg-black/40",
          )}
        >
          <input
            type="radio"
            name="player-confirm"
            className="mt-1"
            checked={choice?.type === "new"}
            onChange={() => {
              setChoice({ type: "new" });
              setFullName("");
            }}
          />
          <span className="font-medium text-white">新規選手として登録</span>
        </label>
      </div>

      {choice?.type === "new" || choice?.type === "existing" ? (
        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="text-[11px] text-white/55">フルネーム</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={choice.type === "existing"}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white outline-none focus:border-[color:var(--museum-accent,#d4af37)]"
              placeholder="例: 佐藤輝明"
            />
          </label>
          {choice.type === "new" ? (
            <label className="flex items-center gap-2 text-[12px] text-white/75">
              <input
                type="checkbox"
                checked={isRealPlayer}
                onChange={(e) => setIsRealPlayer(e.target.checked)}
              />
              実在選手として登録（オフ＝架空新人）
            </label>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-[12px] text-red-300">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3.5 py-1.5 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
        >
          確定してマスターへ登録
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-white/15 px-3.5 py-1.5 text-[12px] text-white/70"
          >
            あとで
          </button>
        ) : null}
      </div>
    </section>
  );
}
