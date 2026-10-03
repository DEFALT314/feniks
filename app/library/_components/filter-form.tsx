"use client";

import type { ComponentProps } from "react";

// GET form: filters end up in the page URL. Ticking a checkbox refreshes the results right away,
// and without JavaScript the "Pokaż wyniki" button works.
export function FilterForm(props: ComponentProps<"form">) {
  return (
    <form
      method="get"
      action="/library"
      onChange={(e) => {
        if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
          e.currentTarget.requestSubmit();
        }
      }}
      {...props}
    />
  );
}
