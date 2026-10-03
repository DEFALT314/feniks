"use client";

import type { ComponentProps } from "react";

// Formularz GET: filtry lądują w adresie strony. Zaznaczenie pola od razu odświeża wyniki,
// a bez JavaScriptu działa przycisk „Pokaż wyniki”.
export function FormularzFiltrow(props: ComponentProps<"form">) {
  return (
    <form
      method="get"
      action="/biblioteka"
      onChange={(e) => {
        if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
          e.currentTarget.requestSubmit();
        }
      }}
      {...props}
    />
  );
}
