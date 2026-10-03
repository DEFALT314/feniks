import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Text field from design/makiety/System.dc.html. Focus (navy edge + halo) and the red invalid edge
// come from the global field rule in app/globals.css, shared with every <select> in the app.
const fieldControlClass =
  "w-full rounded-[10px] border border-input bg-white px-3.5 py-3 text-lg text-ink hover:border-ink-muted disabled:cursor-not-allowed disabled:opacity-60";

function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldControlClass, className)} {...props} />;
}

function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(fieldControlClass, "resize-y", className)}
      {...props}
    />
  );
}

export { Input, Textarea };
