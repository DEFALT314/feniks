import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// White panel with a thin border (`.card` in design/makiety/System.dc.html)
function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("border-border bg-card text-card-foreground rounded-xl border p-6", className)}
      {...props}
    />
  );
}

export { Card };
