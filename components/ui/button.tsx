import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Buttons from design/makiety/System.dc.html. Use `buttonVariants()` to style a <Link> as a button.
// Each variant sets its own border color: `cn` can't merge our custom theme colors, so don't override
// colors through className; add a variant instead.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] border font-bold whitespace-nowrap no-underline transition-[background-color,border-color,color,box-shadow,transform] select-none active:scale-[0.98] data-disabled:cursor-not-allowed data-disabled:opacity-70 data-disabled:active:scale-100 motion-reduce:transition-colors motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground hover:border-navy-strong hover:bg-navy-strong hover:text-white",
        secondary: "border-navy bg-white text-navy hover:bg-navy-soft hover:text-navy-strong",
        tertiary:
          "border-transparent bg-transparent text-navy underline underline-offset-[3px] hover:text-navy-strong",
        destructive: "border-danger bg-white text-danger hover:bg-danger-soft",
        // Neutral square controls in the header (A+, notifications)
        outline:
          "border-input bg-white text-ink hover:border-navy hover:text-ink aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white",
      },
      size: {
        default: "min-h-[50px] px-[22px] text-[1.0625rem]",
        sm: "min-h-11 px-4 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

// A disabled button stays focusable (aria-disabled instead of the native attribute): with
// `disabled={pending}` the native attribute would throw focus to <body> right after a submit
// (WCAG 2.4.3). Clicks and Enter are still blocked by Base UI.
function Button({ className, variant, size, focusableWhenDisabled = true, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      focusableWhenDisabled={focusableWhenDisabled}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
