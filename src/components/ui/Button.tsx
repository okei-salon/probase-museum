import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonVariant = "ghost" | "outline" | "solid";
type ButtonSize = "sm" | "md";

type BaseProps = {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type ButtonProps = BaseProps &
  (
    | ({ href: string } & Omit<
        React.AnchorHTMLAttributes<HTMLAnchorElement>,
        "href" | "className" | "children"
      >)
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  );

const variantStyles: Record<ButtonVariant, string> = {
  ghost:
    "border border-museum-gold/45 bg-black/75 text-museum-ivory",
  outline:
    "border border-museum-gold/55 bg-transparent text-museum-gold",
  solid:
    "border border-museum-gold/60 bg-museum-gold/20 text-museum-gold-soft",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[11px] tracking-[0.04em]",
  md: "h-9 gap-2 px-4 text-xs tracking-[0.04em]",
};

const baseStyles =
  "inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-museum-gold/40";

export function Button({
  children,
  className,
  variant = "ghost",
  size = "md",
  ...props
}: ButtonProps) {
  const classes = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      className={classes}
      type={buttonProps.type ?? "button"}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
