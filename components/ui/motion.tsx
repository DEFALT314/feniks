"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import {
  countAt,
  DURATION,
  EASE,
  entranceDelay,
  hasReached,
  MOTION_ATTRIBUTE,
  MOTION_WAIT_ATTRIBUTE,
  parseCount,
  parseKinds,
  REACT_FIBER_KEY,
  revealDelay,
} from "./motion-core";

// Plays the motion that screens describe with data-ruch attributes, the same contract as
// design/makiety/ruch.js:
//   wejscie  children enter one by one when the page opens
//   pokaz    children enter one by one when the container scrolls into view
//   licznik  a number counts up from zero
//   slupki   elements marked data-ruch-bar grow from the left
//   postep   a progress bar (first child) fills from the left
//   zakresl  a highlighter sweeps over every <mark> inside
//   wybor    a chosen option (its <label>) gets a short confirmation
//   odswiez  changing a filter refreshes the list given by data-ruch-lista (a selector)
// Hover, press and focus stay in CSS. With prefers-reduced-motion nothing moves.
// Mounted once in app/layout.tsx; runs again for every new page.

const seen = new WeakSet<Element>();

// React marks every element it has hydrated or rendered with an internal "__reactFiber$…" key.
function isHydrated(el: Element): boolean {
  return Object.keys(el).some((key) => key.startsWith(REACT_FIBER_KEY));
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rise(distance: number): Keyframe[] {
  return [
    { opacity: 0, transform: `translateY(${distance}px)` },
    { opacity: 1, transform: "none" },
  ];
}

function children(el: Element): HTMLElement[] {
  return Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
}

function sweep(marks: HTMLElement[], delay: number, stagger: number) {
  marks.forEach((mark, i) => {
    mark.animate([{ backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%" }], {
      duration: DURATION.mark,
      delay: delay + i * stagger,
      easing: EASE.power3Out,
      fill: "backwards",
    });
  });
}

// While the number runs it is hidden from screen readers, which would otherwise read "0" or "17"
// instead of the real value.
function countUp(el: HTMLElement) {
  const target = parseCount(el.textContent);
  if (target === null) return;
  const final = el.textContent;
  const start = performance.now();
  const frame = (now: number) => {
    const progress = (now - start) / DURATION.count;
    if (progress >= 1) {
      el.textContent = final;
      el.removeAttribute("aria-hidden");
      return;
    }
    el.textContent = String(countAt(target, progress));
    requestAnimationFrame(frame);
  };
  el.setAttribute("aria-hidden", "true");
  el.textContent = "0";
  requestAnimationFrame(frame);
}

type Waiting = { el: Element; play: () => void; cancel: () => void; ready?: () => boolean };

// Waits until the element's top passes 88% of the screen height, like ScrollTrigger "top 88%":
// also when the reader jumps past it (End key, anchor link). `cancel` shows it as it is and lets
// the next run pick it up again.
// `ready` holds it back longer, e.g. until React has hydrated an element whose text will change.
function whenVisible(
  el: Element,
  play: () => void,
  waiting: Waiting[],
  cancel = () => {},
  ready?: () => boolean,
) {
  waiting.push({ el, play, cancel, ready });
}

function playScreen(): () => void {
  const waiting: Waiting[] = [];
  let entrance = 0;
  let frame = 0;

  document.querySelectorAll(`[${MOTION_ATTRIBUTE}]`).forEach((el) => {
    if (seen.has(el) || !(el instanceof HTMLElement)) return;
    seen.add(el);
    const kinds = parseKinds(el.getAttribute(MOTION_ATTRIBUTE));

    if (kinds.includes("wejscie")) {
      const container = entrance++;
      children(el).forEach((child, i) =>
        child.animate(rise(14), {
          duration: DURATION.slow,
          delay: entranceDelay(container, i),
          easing: EASE.expoOut,
          fill: "backwards",
        }),
      );
    }

    if (kinds.includes("pokaz")) {
      // Paused at the start keyframe, so the children stay hidden until they scroll into view
      const animations = children(el).map((child, i) => {
        const a = child.animate(rise(18), {
          duration: DURATION.slow,
          delay: revealDelay(i),
          easing: EASE.expoOut,
          fill: "backwards",
        });
        a.pause();
        return a;
      });
      whenVisible(
        el,
        () => animations.forEach((a) => a.play()),
        waiting,
        () => animations.forEach((a) => a.cancel()),
      );
    }

    // The counter rewrites the text. The layout hydrates before a streamed page, so changing the
    // text of a page that React has not hydrated yet would fail hydration and re-render the page.
    if (kinds.includes("licznik"))
      whenVisible(
        el,
        () => countUp(el),
        waiting,
        undefined,
        () => isHydrated(el),
      );

    if (kinds.includes("slupki")) {
      whenVisible(
        el,
        () =>
          el.querySelectorAll<HTMLElement>("[data-ruch-bar]").forEach((bar, i) =>
            bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
              duration: DURATION.bar,
              delay: i * 60,
              easing: EASE.power3Out,
              fill: "backwards",
            }),
          ),
        waiting,
      );
    }

    if (kinds.includes("postep") && el.firstElementChild instanceof HTMLElement) {
      el.firstElementChild.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration: DURATION.progress,
        delay: 300,
        easing: EASE.power3Out,
        fill: "backwards",
      });
    }

    if (kinds.includes("zakresl")) sweep(Array.from(el.querySelectorAll("mark")), 500, 120);
  });

  const check = () => {
    frame = 0;
    let pending = false;
    for (const entry of [...waiting]) {
      if (hasReached(entry.el.getBoundingClientRect().top, window.innerHeight)) {
        if (entry.ready && !entry.ready()) {
          pending = true;
          continue;
        }
        waiting.splice(waiting.indexOf(entry), 1);
        entry.play();
      }
    }
    if (pending) schedule();
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(check);
  };
  // Keyboard focus can reach a hidden child before it scrolls far enough: show it right away, or
  // the focused element would be invisible (WCAG 2.4.7)
  const onFocus = (event: FocusEvent) => {
    for (const entry of [...waiting]) {
      if (event.target instanceof Node && entry.el.contains(event.target)) {
        waiting.splice(waiting.indexOf(entry), 1);
        entry.cancel();
      }
    }
  };
  // Printing and "Save as PDF" take the page as it is: show everything that is still waiting
  const onPrint = () => waiting.splice(0).forEach((entry) => entry.cancel());
  check();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("focusin", onFocus);
  window.addEventListener("beforeprint", onPrint);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("focusin", onFocus);
    window.removeEventListener("beforeprint", onPrint);
    waiting.splice(0).forEach(({ el, cancel }) => {
      cancel();
      seen.delete(el);
    });
  };
}

// Delegated, so it also works for options rendered later
function onChange(event: Event) {
  if (!(event.target instanceof Element) || reducedMotion()) return;

  const choice = event.target.closest(`[${MOTION_ATTRIBUTE}~="wybor"]`);
  const label = choice ? event.target.closest("label") : null;
  label?.animate([{ transform: "scale(0.97)" }, { transform: "scale(1)" }], {
    duration: 500,
    easing: EASE.backOut,
  });

  const filters = event.target.closest(`[${MOTION_ATTRIBUTE}~="odswiez"]`);
  const list = filters?.getAttribute("data-ruch-lista");
  if (list) {
    document.querySelectorAll<HTMLElement>(list).forEach((item, i) =>
      item.animate(
        [
          { opacity: 0.25, transform: "translateY(8px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 350, delay: i * 40, easing: EASE.expoOut, fill: "backwards" },
      ),
    );
  }
}

export function Motion() {
  const pathname = usePathname();

  // Before paint, so a new page's entrance never flashes in its final state
  useLayoutEffect(() => {
    const root = document.documentElement;
    // A page opened in a background tab shows its content right away: hidden tabs don't run
    // animations, so a preview or thumbnail would otherwise catch the hidden start state.
    if (reducedMotion() || document.visibilityState === "hidden") {
      root.removeAttribute(MOTION_WAIT_ATTRIBUTE);
      return;
    }
    const stop = playScreen();
    root.removeAttribute(MOTION_WAIT_ATTRIBUTE);
    return stop;
  }, [pathname]);

  useEffect(() => {
    document.addEventListener("change", onChange);
    // Reduced motion switched on while the page is open: finish everything at once
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionPreference = () => {
      if (query.matches) document.getAnimations().forEach((a) => a.finish());
    };
    query.addEventListener("change", onMotionPreference);
    return () => {
      document.removeEventListener("change", onChange);
      query.removeEventListener("change", onMotionPreference);
    };
  }, []);

  return null;
}
