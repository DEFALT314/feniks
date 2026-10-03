import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Text field from design/makiety/System.dc.html; red 2px border when aria-invalid
const fieldControlClass =
  "w-full rounded-[10px] border border-input bg-white px-3.5 py-3 text-lg text-ink transition-[border-color,box-shadow] hover:border-ink-muted focus:border-navy focus:shadow-[0_0_0_1px_var(--navy)] disabled:cursor-not-allowed disabled:opacity-70 aria-invalid:border-2 aria-invalid:border-danger";

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
