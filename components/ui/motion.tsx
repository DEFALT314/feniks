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
    mark.style.backgroundRepeat = "no-repeat";
    mark.animate([{ backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%" }], {
      duration: DURATION.mark,
      delay: delay + i * stagger,
      easing: EASE.power3Out,
      fill: "backwards",
    });
  });
}

function countUp(el: HTMLElement) {
  const target = parseCount(el.textContent);
  if (target === null) return;
  const start = performance.now();
  const frame = (now: number) => {
    const progress = (now - start) / DURATION.count;
    el.textContent = String(countAt(target, progress));
    if (progress < 1) requestAnimationFrame(frame);
  };
  el.textContent = "0";
  requestAnimationFrame(frame);
}

type Waiting = { el: Element; play: () => void; cancel: () => void };

// Waits until the element's top passes 88% of the screen height, like ScrollTrigger "top 88%":
// also when the reader jumps past it (End key, anchor link). `cancel` shows it as it is and lets
// the next run pick it up again.
function whenVisible(el: Element, play: () => void, waiting: Waiting[], cancel = () => {}) {
  waiting.push({ el, play, cancel });
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

    if (kinds.includes("licznik")) whenVisible(el, () => countUp(el), waiting);

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
      el.firstElementChild.style.transformOrigin = "left center";
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
    for (const entry of [...waiting]) {
      if (hasReached(entry.el.getBoundingClientRect().top, window.innerHeight)) {
        waiting.splice(waiting.indexOf(entry), 1);
        entry.play();
      }
    }
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(check);
  };
  check();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
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
    return () => document.removeEventListener("change", onChange);
  }, []);

  return null;
}
