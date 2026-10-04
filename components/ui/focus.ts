"use client";

import { useEffect, useRef, type RefObject } from "react";

// Focus helpers for things screen-reader and keyboard users would otherwise miss (WCAG 2.4.3,
// 3.3.1): an error after submit, new content after a step change, a button that disappeared.

/** Focuses an element that isn't focusable by itself (heading, region) without a Tab stop. */
export function focusElement(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  if (!el.matches("a[href], button, input, select, textarea, [tabindex]")) {
    el.setAttribute("tabindex", "-1");
  }
  el.focus();
  return document.activeElement === el;
}

/**
 * After a failed submit: the first invalid field (its label and error are read through
 * aria-describedby), or else the form-level message marked with `data-form-error`.
 */
export function focusFirstError(root: ParentNode | null | undefined): boolean {
  if (!root) return false;
  const field = root.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (field) return focusElement(field);
  return focusElement(root.querySelector<HTMLElement>("[data-form-error]"));
}

/**
 * Runs `focusFirstError` inside `ref` every time `result` changes to a new truthy value, e.g. the
 * state returned by useActionState. Pass `undefined` while there is nothing to report.
 */
export function useFocusFirstError(ref: RefObject<HTMLElement | null>, result: unknown) {
  useEffect(() => {
    if (result) focusFirstError(ref.current);
  }, [ref, result]);
}

/**
 * Moves focus to `ref` when `key` changes after the first render: a new wizard step, another
 * conversation, a panel that replaced the button the user pressed. Pass `null` to skip a change.
 */
export function useFocusOnChange(ref: RefObject<HTMLElement | null>, key: unknown) {
  const previous = useRef(key);
  useEffect(() => {
    if (Object.is(previous.current, key)) return;
    previous.current = key;
    if (key !== null) focusElement(ref.current);
  }, [ref, key]);
}
