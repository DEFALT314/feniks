import Link from "next/link";
import { cn } from "@/lib/utils";

export type Step = {
  id: string;
  label: string;
  href: string;
  done: number;
  total: number;
};

type StepsProps = {
  label: string;
  steps: Step[];
  currentId: string;
  className?: string;
};

// Side list of wizard parts with progress (design/makiety/Kreator.dc.html, "Kanwa innowacji")
function Steps({ label, steps, currentId, className }: StepsProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-col gap-0.5">
        {steps.map((step) => {
          const current = step.id === currentId;
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "text-ink flex justify-between gap-2 rounded-lg px-3 py-2.5 text-[1.0625rem] no-underline transition-colors",
                  current
                    ? "bg-navy-soft text-navy hover:text-navy font-bold"
                    : "hover:bg-neutral-soft hover:text-ink",
                )}
              >
                <span>{step.label}</span>
                <span className={cn("text-base", !current && "text-muted-foreground")}>
                  <span className="sr-only">wypełniono </span>
                  <span aria-hidden="true">
                    {step.done}/{step.total}
                  </span>
                  <span className="sr-only">
                    {step.done} z {step.total}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Steps };
