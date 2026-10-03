// Motion tokens and pure helpers for components/ui/motion.tsx. Timings and curves follow
// design/makiety/ruch.js (GSAP there; here the browser's Web Animations API, no library).

export const MOTION_ATTRIBUTE = "data-ruch";
export const MOTION_WAIT_ATTRIBUTE = "data-ruch-czeka";

// Hide entrance elements before the first paint so they don't blink; a fuse shows them after 2.5 s
// even if the script never runs. Skipped when the user prefers reduced motion.
export const MOTION_WAIT_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){var d=document.documentElement;d.setAttribute("${MOTION_WAIT_ATTRIBUTE}","");setTimeout(function(){d.removeAttribute("${MOTION_WAIT_ATTRIBUTE}")},2500)}}catch(e){}`;

export const EASE = {
  expoOut: "cubic-bezier(0.16, 1, 0.3, 1)", // gsap expo.out, also --ease in globals.css
  power3Out: "cubic-bezier(0.215, 0.61, 0.355, 1)",
  backOut: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export const DURATION = { slow: 420, count: 1100, bar: 700, progress: 800, mark: 500 } as const;

export type MotionKind =
  "wejscie" | "pokaz" | "licznik" | "slupki" | "postep" | "zakresl" | "wybor" | "odswiez";

const KINDS: readonly MotionKind[] = [
  "wejscie",
  "pokaz",
  "licznik",
  "slupki",
  "postep",
  "zakresl",
  "wybor",
  "odswiez",
];

/** `data-ruch="wejscie zakresl"` → ["wejscie", "zakresl"]; unknown words are ignored. */
export function parseKinds(value: string | null): MotionKind[] {
  return (value ?? "").split(/\s+/).filter((k): k is MotionKind => KINDS.includes(k as MotionKind));
}

/** Delay of a child in an entrance: containers start one after another, children follow each other. */
export function entranceDelay(containerIndex: number, childIndex: number): number {
  return 50 + containerIndex * 120 + childIndex * 70;
}

/** Scroll reveal starts once the element's top is above 88% of the screen (ScrollTrigger "top 88%"). */
export function hasReached(top: number, viewportHeight: number): boolean {
  return top < viewportHeight * 0.88;
}

/** Delay of a child revealed on scroll. */
export function revealDelay(childIndex: number): number {
  return childIndex * 60;
}

/** The number a counter counts to, e.g. "1 234" → 1234; null when the text is not a whole number. */
export function parseCount(text: string | null): number | null {
  const digits = (text ?? "").replace(/[\s ]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

/** Value shown by a counter at progress 0..1, eased like gsap power2.out and rounded down. */
export function countAt(target: number, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.floor(target * (1 - (1 - p) ** 2));
}
