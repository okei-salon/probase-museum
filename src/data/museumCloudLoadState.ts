/**
 * Museum 全体の Neon hydrate 進行状態（表示用）。
 * 保存データは触らない。Bootstrap と各ボードが共有する。
 */

export type MuseumCloudLoadPhase = "idle" | "loading" | "ready" | "error";

export type MuseumCloudLoadState = {
  phase: MuseumCloudLoadPhase;
  errorMessage: string | null;
};

let phase: MuseumCloudLoadPhase = "idle";
let errorMessage: string | null = null;

const EVENT = "probase-museum-cloud-load";

function emit(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function getMuseumCloudLoadState(): MuseumCloudLoadState {
  return { phase, errorMessage };
}

export function setMuseumCloudLoadLoading(): void {
  phase = "loading";
  errorMessage = null;
  emit();
}

export function setMuseumCloudLoadReady(): void {
  phase = "ready";
  errorMessage = null;
  emit();
}

export function setMuseumCloudLoadError(message: string): void {
  phase = "error";
  errorMessage = message;
  emit();
}

/** テスト用 */
export function resetMuseumCloudLoadStateForTests(): void {
  phase = "idle";
  errorMessage = null;
}

export function subscribeMuseumCloudLoad(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
