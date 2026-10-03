import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Grey placeholder of content that is still loading. Pulses gently; still with reduced motion.
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "bg-neutral-soft animate-pulse rounded-[10px] motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

// One card from a list: title, two lines of text, a button
function CardSkeleton() {
  return (
    <div className="border-border flex flex-col gap-3 rounded-xl border bg-white p-6">
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-5/6" />
      <Skeleton className="mt-2 h-11 w-36" />
    </div>
  );
}

type PageSkeletonProps = {
  label: string; // read by screen readers, e.g. "Wczytywanie testów…"
  layout?: "grid" | "split"; // grid: cards in two columns; split: list on the left, panel on the right
  cards?: number;
};

// The shape of a whole page while it loads (header band, then cards), used by loading.tsx files.
// The page keeps <main id="main-content"> so the skip link works during loading too.
function PageSkeleton({ label, layout = "grid", cards = 4 }: PageSkeletonProps) {
  const list = Array.from({ length: cards }, (_, i) => <CardSkeleton key={i} />);
  return (
    <main id="main-content" className="flex-1" aria-busy="true">
      <p role="status" className="sr-only">
        {label}
      </p>
      <div className="border-border border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-10 pb-8 sm:px-10">
          <Skeleton className="h-12 w-full max-w-[520px]" />
          <Skeleton className="h-5 w-full max-w-[760px]" />
          <Skeleton className="h-5 w-full max-w-[560px]" />
        </div>
      </div>
      {layout === "split" ? (
        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 pt-9 pb-16 sm:px-10">
          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            {list}
          </div>
          <div className="flex max-w-[420px] flex-[1_1_360px] flex-col gap-4">
            <div className="border-border flex flex-col gap-4 rounded-xl border bg-white p-6">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-[50px] w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-8 pb-16 sm:px-10">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 md:grid-cols-2">{list}</div>
        </div>
      )}
    </main>
  );
}

export { Skeleton, CardSkeleton, PageSkeleton };
