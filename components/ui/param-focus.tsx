"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { announce } from "@/components/ui/announcer";
import { useFocusOnChange } from "@/components/ui/focus";

// Same-route `?idea=` / `?card=` / `?thread=` navigation keeps focus on the clicked link and the
// page title stays the same, so nothing tells a screen-reader user that the detail changed
// (WCAG 2.4.3, 4.1.3). These two helpers live in server-rendered pages.

type HeadingProps = ComponentProps<"h2"> & {
  level?: 1 | 2;
  /** Focus moves to this heading when the key changes after the first render. */
  focusKey: string | null;
};

/** A heading that takes focus when the selected item (`focusKey`) changes. */
export function FocusHeading({ level = 2, focusKey, ...props }: HeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useFocusOnChange(ref, focusKey);
  const Tag = level === 1 ? "h1" : "h2";
  return <Tag ref={ref} tabIndex={-1} {...props} />;
}

/** Announces `message` when `changeKey` changes after the first render (e.g. a new filter). */
export function AnnounceOnChange({ changeKey, message }: { changeKey: string; message: string }) {
  const previous = useRef(changeKey);
  useEffect(() => {
    if (previous.current === changeKey) return;
    previous.current = changeKey;
    announce(message);
  }, [changeKey, message]);
  return null;
}

/**
 * Result of a server action that redirected back with `?msg=`: the pressed button is gone, so the
 * message takes focus (a live region that arrives together with its text is not read out).
 */
export function FlashMessage({ message, ok }: { message: string | null; ok: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <p ref={ref} tabIndex={-1} className="m-0 font-bold">
      <span className={ok ? "text-success" : "text-danger"}>{message}</span>
    </p>
  );
}
