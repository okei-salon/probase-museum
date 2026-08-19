"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MuseumIcon } from "@/components/ui/MuseumIcon";
import { cn } from "@/lib/cn";

type MeResponse = {
  ok?: boolean;
  authenticated?: boolean;
};

type AuthUserMenuProps = {
  compact?: boolean;
  className?: string;
};

export function AuthUserMenu({ compact = false, className }: AuthUserMenuProps) {
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

  if (!me?.authenticated) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="hover:text-museum-gold disabled:opacity-50"
        >
          {loggingOut ? "…" : "ログアウト"}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      <div
        className={cn(
          "hidden h-9 items-center gap-2 rounded-md border border-white/25 bg-black/55 px-2.5",
          "text-[11px] text-museum-ivory sm:inline-flex",
        )}
      >
        <MuseumIcon name="userRound" size={13} className="text-museum-ivory" />
        <span className="leading-tight">入館中</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="h-8 rounded-md border-white/25 bg-black/55 px-2.5 text-[11px] text-museum-ivory"
      >
        {loggingOut ? "…" : "ログアウト"}
      </Button>
    </div>
  );
}
