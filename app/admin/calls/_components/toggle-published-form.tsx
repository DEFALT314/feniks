"use client";

import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { togglePublishedAction } from "../actions";

/** What a screen reader hears after "Włącz" / "Wyłącz": only the badge changes on screen. */
export function toggleMessage(name: string, on: boolean): string {
  return on ? `Nabór „${name}” jest włączony.` : `Nabór „${name}” jest wyłączony.`;
}

// "Włącz" / "Wyłącz" a call. The badge text changes silently, so the result is announced (4.1.3).
export function TogglePublishedForm({
  id,
  name,
  published,
}: {
  id: string;
  name: string;
  published: boolean;
}) {
  return (
    <form
      action={async (formData) => {
        await togglePublishedAction(formData);
        announce(toggleMessage(name, !published));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="on" value={published ? "false" : "true"} />
      <Button type="submit" variant="secondary" size="sm">
        {published ? "Wyłącz" : "Włącz"}
        <span className="sr-only">: {name}</span>
      </Button>
    </form>
  );
}
