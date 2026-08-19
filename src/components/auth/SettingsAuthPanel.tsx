"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeResponse = {
  authenticated?: boolean;
};

export function SettingsAuthPanel() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setMe({ authenticated: false });
          return;
        }
        const data = (await res.json()) as MeResponse;
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMe({ authenticated: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  if (!me) {
    return (
      <p className="text-[13px] text-museum-ivory-muted">読み込み中…</p>
    );
  }

  if (!me.authenticated) {
    return (
      <p className="text-[13px] text-museum-ivory-muted">
        ログイン情報が取得できません。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-museum-ivory-muted">
        アクセスコードで入館中です。RED / BLUE
        はMuseum内のWORLD区分として従来どおり利用できます。
      </p>
      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="rounded-[var(--radius-control)] border border-museum-gold/45 bg-black/55 px-4 py-2 text-[12px] tracking-[0.08em] text-museum-ivory transition-colors hover:border-museum-gold/70 disabled:opacity-50"
      >
        {loggingOut ? "ログアウト中…" : "ログアウト"}
      </button>
    </div>
  );
}
