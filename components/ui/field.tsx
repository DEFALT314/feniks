import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Props the form control must receive so the label, hint and error are announced by screen readers
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

export function fieldControlProps(id: string, hasHint: boolean, hasError: boolean) {
  const describedBy = [hasHint && `${id}-hint`, hasError && `${id}-error`].filter(Boolean);
  const props: FieldControlProps = { id };
  if (describedBy.length) props["aria-describedby"] = describedBy.join(" ");
  if (hasError) props["aria-invalid"] = true;
  return props;
}

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Adds "(wymagane)" to the label; set `required` on the control too. */
  required?: boolean;
  id?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

// Label above, then hint, error and the control: <Field label="…">{(p) => <Input {...p} />}</Field>
// After a failed submit call useFocusFirstError (focus.ts): focusing the invalid control reads its
// label and this error, which a static error text alone never does.
function Field({ label, hint, error, required, id, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <div data-slot="field" className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={controlId} className="font-bold">
        {label}
        {required ? <span className="text-muted-foreground font-normal"> (wymagane)</span> : null}
      </label>
      {hint ? (
        <p id={`${controlId}-hint`} className="text-muted-foreground text-base">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${controlId}-error`} className="t-text-in text-danger text-base font-bold">
          {error}
        </p>
      ) : null}
      {children(fieldControlProps(controlId, Boolean(hint), Boolean(error)))}
    </div>
  );
}

export { Field };
