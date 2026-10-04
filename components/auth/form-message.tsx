// Form-level message (errors in bold red, info in plain text). Both regions are always in the
// page and only their text changes: a region that appears together with its text is often not
// read (WCAG 4.1.3). Errors are not a live region: the form moves focus to them after a failed
// submit (useFocusFirstError looks for `data-form-error`), so they are read once, and again
// when the same error comes back.
export function FormMessage({
  message,
  tone = "error",
}: {
  message?: string;
  tone?: "error" | "info";
}) {
  const error = tone === "error" && message ? message : null;
  const info = tone === "info" && message ? message : null;
  return (
    <>
      <p data-form-error={error ? "" : undefined} className="text-base empty:hidden">
        {error ? <strong className="text-danger">{error}</strong> : null}
      </p>
      <p role="status" className="text-base empty:sr-only">
        {info}
      </p>
    </>
  );
}
