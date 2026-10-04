import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChoiceTileProps = Omit<ComponentProps<"input">, "type" | "title" | "size"> & {
  title: ReactNode;
  description?: ReactNode;
  type?: "radio" | "checkbox";
  size?: "default" | "compact"; // compact for long lists of short options
};

// Large option (`.tile` in design/makiety/Kreator.dc.html): a radio, or a checkbox for "pick several".
// Group tiles in a <fieldset> with a <legend>.
function ChoiceTile({
  title,
  description,
  type = "radio",
  size = "default",
  className,
  ...inputProps
}: ChoiceTileProps) {
  return (
    <label
      data-slot="choice-tile"
      className={cn(
        "border-border hover:border-navy has-checked:border-navy has-focus-visible:outline-ring flex cursor-pointer items-start gap-3.5 rounded-xl border bg-white px-5 transition-[border-color,box-shadow] has-checked:border-2 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-70 has-aria-disabled:cursor-not-allowed has-aria-disabled:opacity-70",
        size === "compact" ? "min-h-14 py-3" : "min-h-[84px] py-[18px]",
        className,
      )}
    >
      <input
        type={type}
        className="accent-navy mt-1 size-[22px] shrink-0 focus-visible:outline-none"
        {...inputProps}
      />
      <span className="flex flex-col gap-0.5">
        <strong className={size === "compact" ? "text-lg" : "text-[1.1875rem]"}>{title}</strong>
        {description ? <span className="text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}

export { ChoiceTile };
