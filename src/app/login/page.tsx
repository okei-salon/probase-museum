import { AtmosphericBackground } from "@/components/layout/AtmosphericBackground";
import { LoginForm } from "@/components/auth/LoginForm";
import { homeBackgroundFrame } from "@/config/categoryThemes";
import { media } from "@/config/media";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AtmosphericBackground
        asset={media.backgrounds.home}
        frame={homeBackgroundFrame}
        priority
      />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md space-y-8 rounded-[var(--radius-card)] border border-museum-gold/35 bg-black/75 px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:px-8 sm:py-10">
          <header className="space-y-3 text-center">
            <p className="font-display text-[11px] tracking-[0.28em] text-museum-gold">
              PROBASE
            </p>
            <h1 className="font-display text-[2rem] tracking-[0.12em] text-museum-ivory sm:text-[2.25rem]">
              MUSEUM
            </h1>
            <p className="text-[12px] tracking-[0.16em] text-museum-ivory-soft">
              Private Museum Access
            </p>
            <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-museum-gold/70 to-transparent" />
          </header>

          <LoginForm />

          <p className="text-center text-[10px] leading-relaxed tracking-[0.04em] text-white/40">
            関係者以外のアクセスはご遠慮ください。
          </p>
        </div>
      </div>
    </div>
  );
}
