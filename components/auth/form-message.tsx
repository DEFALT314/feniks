// Form-level message announced by screen readers (errors in bold red, info in plain text)
export function FormMessage({
  message,
  tone = "error",
}: {
  message?: string;
  tone?: "error" | "info";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className="text-base empty:hidden"
    >
      {message ? (
        tone === "error" ? (
          <strong className="text-danger">{message}</strong>
        ) : (
          message
        )
      ) : null}
    </p>
  );
}
