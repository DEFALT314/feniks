"use client";

import { useEffect, useState } from "react";

// Shown while the AI picks innovations (8–25 s on the free model, ~2 s on paid DeepSeek).
// It is not a live region: the caller announces one short sentence through announce()
// (components/ui/announcer.tsx), and the rotating step line and counter are visual only
// (aria-hidden), so screen readers are not flooded with updates. All motion stops with
// prefers-reduced-motion.

export const AI_STEPS = [
  "Czytam Twój opis…",
  "Porównuję go z opisami innowacji z Biblioteki ROPS…",
  "Sprawdzam, kto może je wdrożyć…",
  "Piszę, dlaczego pasują…",
];
const STEP_SECONDS = 3;

// Fills quickly at first, then slows down and never reaches the end before the answer arrives.
export function progressPercent(seconds: number): number {
  return Math.round(95 * (1 - Math.exp(-seconds / 8)));
}

export function stepAt(seconds: number, steps: string[] = AI_STEPS): string {
  return steps[Math.min(Math.floor(seconds / STEP_SECONDS), steps.length - 1)];
}

type AiProgressProps = {
  title?: string;
  steps?: string[];
  note?: string | null;
};

// Also used by /my/middleman with its own title and steps.
export function AiProgress({
  title = "AI wybiera najlepiej pasujące innowacje",
  steps = AI_STEPS,
  note = "Poniżej wstępne wyniki wyszukiwania. Za chwilę zastąpi je wybór AI z uzasadnieniem.",
}: AiProgressProps = {}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border-navy/20 bg-navy-soft mb-5 flex flex-col gap-3 rounded-xl border px-5 py-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="relative flex size-3 shrink-0">
          <span className="bg-navy absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
          <span className="bg-navy relative inline-flex size-3 rounded-full" />
        </span>
        <p className="text-navy font-bold">{title}</p>
        <span aria-hidden="true" className="text-ink-muted ml-auto text-base tabular-nums">
          {seconds} s
        </span>
      </div>
      <p aria-hidden="true" className="text-ink-muted text-base">
        {stepAt(seconds, steps)}
      </p>
      <div
        aria-hidden="true"
        className="h-1.5 overflow-hidden rounded-full bg-white forced-colors:border forced-colors:border-[CanvasText]"
      >
        <div
          className="bg-navy h-full rounded-full transition-[width] duration-1000 ease-out forced-color-adjust-none motion-reduce:transition-none forced-colors:bg-[CanvasText]"
          style={{ width: `${progressPercent(seconds)}%` }}
        />
      </div>
      {note ? <p className="text-ink-muted text-[0.9375rem]">{note}</p> : null}
    </div>
  );
}

// Placeholder cards for the sub-second search phase, so the page does not jump.
export function ResultSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="bg-line h-9 w-40 animate-pulse rounded-lg motion-reduce:animate-none" />
      {[0, 1, 2].map((n) => (
        <div key={n} className="border-border flex flex-col gap-3 rounded-xl border bg-white p-6">
          <div className="bg-line h-6 w-2/3 animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-line h-4 w-full animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-line h-4 w-5/6 animate-pulse rounded motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
