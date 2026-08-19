"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { cn } from "@/lib/cn";

export function LoginForm() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "アクセスコードが違います");
        setPending(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。再度お試しください。");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-[11px] tracking-[0.14em] text-museum-ivory-soft">
          アクセスコード
        </span>
        <input
          name="accessCode"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          required
          className={cn(
            "w-full rounded-[var(--radius-control)] border border-museum-gold/35",
            "bg-black/55 px-3 py-2.5 text-center text-[16px] tracking-[0.28em] text-museum-ivory",
            "placeholder:tracking-normal placeholder:text-white/30",
            "outline-none focus:border-museum-gold/70 focus:ring-1 focus:ring-museum-gold/30",
          )}
          placeholder="Access Code"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-950/40 px-3 py-2 text-[12px] text-red-200/90"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "w-full rounded-[var(--radius-control)] border border-museum-gold/60",
          "bg-museum-gold/20 py-3 font-display text-[13px] tracking-[0.18em]",
          "text-museum-gold-soft transition-colors",
          "hover:bg-museum-gold/30 disabled:cursor-wait disabled:opacity-60",
        )}
      >
        {pending ? "確認中…" : "MUSEUMへ入る"}
      </button>
    </form>
  );
}
