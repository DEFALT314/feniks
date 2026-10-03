import { cn } from "@/lib/utils";

// HubMI logo, "Razem" mark: two people forming a heart (design/logo/README.md).
// Brand colors are fixed on purpose: don't change colors or proportions, minimum mark size 16 px.
const COLORS = {
  light: { left: "#1F3A8A", right: "#C2452B" }, // on light backgrounds (design/logo/hubmi-znak.svg)
  dark: { left: "#FFFFFF", right: "#FF9B85" }, // on navy backgrounds (design/logo/hubmi-znak-bialy.svg)
};

type Variant = keyof typeof COLORS;

export function LogoMark({ variant = "light", size = 40 }: { variant?: Variant; size?: number }) {
  const { left, right } = COLORS[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <circle cx="14.5" cy="9" r="5.5" fill={left} />
      <circle cx="33.5" cy="9" r="5.5" fill={right} />
      <path
        d="M23.4 44 C 12 36.5, 3.5 29, 5.5 21.5 C 7 16.5, 13.5 15.5, 17.5 18.5 C 20.3 20.6, 22.3 23, 23.4 25.5 Z"
        fill={left}
      />
      <path
        d="M24.6 44 C 36 36.5, 44.5 29, 42.5 21.5 C 41 16.5, 34.5 15.5, 30.5 18.5 C 27.7 20.6, 25.7 23, 24.6 25.5 Z"
        fill={right}
      />
    </svg>
  );
}

// Mark + "HubMI" + tagline. Decorative: wrap it in a link with an aria-label where it leads somewhere.
export function Logo({ variant = "light", className }: { variant?: Variant; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark variant={variant} />
      <span className="flex flex-col leading-[1.05]">
        <span className="font-heading text-[1.4375rem] font-bold tracking-[-0.02em]">HubMI</span>
        <span
          className={cn(
            "text-[0.8125rem]",
            variant === "light" ? "text-muted-foreground" : "text-white/85",
          )}
        >
          innowacje społeczne Małopolski
        </span>
      </span>
    </span>
  );
}
