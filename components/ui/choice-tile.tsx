import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChoiceTileProps = Omit<ComponentProps<"input">, "type" | "title"> & {
  title: ReactNode;
  description?: ReactNode;
};

// Large radio option (`.tile` in design/makiety/Kreator.dc.html). Group tiles in a <fieldset> with a <legend>.
function ChoiceTile({ title, description, className, ...inputProps }: ChoiceTileProps) {
  return (
    <label
      data-slot="choice-tile"
      className={cn(
        "border-border hover:border-navy has-checked:border-navy has-focus-visible:outline-ring flex min-h-[84px] cursor-pointer items-start gap-3.5 rounded-xl border bg-white px-5 py-[18px] transition-[border-color,box-shadow] duration-200 has-checked:border-2 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-60",
        className,
      )}
    >
      <input
        type="radio"
        className="accent-navy mt-1 size-[22px] shrink-0 focus-visible:outline-none"
        {...inputProps}
      />
      <span className="flex flex-col gap-0.5">
        <strong className="text-[19px]">{title}</strong>
        {description ? <span className="text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}

export { ChoiceTile };
