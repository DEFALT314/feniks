// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthFormState } from "@/lib/auth/login";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const actions = vi.hoisted(() => ({
  signIn: vi.fn<(s: AuthFormState, f: FormData) => Promise<AuthFormState>>(),
  signUp: vi.fn<(s: AuthFormState, f: FormData) => Promise<AuthFormState>>(),
  sendPasswordReset: vi.fn<(s: AuthFormState, f: FormData) => Promise<AuthFormState>>(),
  setNewPassword: vi.fn(),
  resendSignupEmail: vi.fn(),
}));
vi.mock("@/lib/auth/actions", () => actions);
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

const { RegisterForm } = await import("./register-form");
const { LoginForm } = await import("./login-form");
const { ForgotPasswordForm } = await import("./forgot-password-form");

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

async function submit(form: HTMLFormElement) {
  await act(async () => {
    form.requestSubmit();
  });
  await act(async () => {});
}

const input = (name: string) => container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

describe("RegisterForm after a failed sign-up", () => {
  it("keeps the password and the consent tick, and focuses the first wrong field", async () => {
    actions.signUp.mockResolvedValue({
      status: "error",
      email: "zly",
      fieldErrors: { email: "Wpisz poprawny adres e-mail." },
    });
    act(() => root.render(<RegisterForm />));
    input("email").value = "zly";
    input("password").value = "dlugie-haslo-123";
    input("consent").checked = true;

    await submit(container.querySelector("form")!);

    expect(actions.signUp).toHaveBeenCalledOnce();
    expect(input("consent").checked).toBe(true);
    expect(input("password").value).toBe("dlugie-haslo-123");
    expect(document.activeElement).toBe(input("email"));
    expect(input("email").getAttribute("aria-invalid")).toBe("true");
  });

  it("marks the required fields in the label text", () => {
    act(() => root.render(<RegisterForm />));
    expect(container.textContent?.match(/\(wymagane\)/g)).toHaveLength(3);
  });
});

describe("LoginForm", () => {
  it("puts 'Nie pamiętasz hasła?' before the password field, as on screen", () => {
    act(() => root.render(<LoginForm />));
    const link = container.querySelector('a[href="/forgot-password"]')!;
    const password = input("password");
    expect(link.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("focuses the form message when the error is not about one field", async () => {
    actions.signIn.mockResolvedValue({
      status: "error",
      email: "anna@example.org",
      message: "Nieprawidłowy e-mail lub hasło.",
    });
    act(() => root.render(<LoginForm />));
    await submit(container.querySelector("form")!);
    const message = container.querySelector("[data-form-error]");
    expect(message?.textContent).toBe("Nieprawidłowy e-mail lub hasło.");
    expect(document.activeElement).toBe(message);
    // An error is not also a polite live region (it is read through focus)
    expect(container.querySelector('[aria-live="polite"]')).toBeNull();
  });
});

describe("ForgotPasswordForm", () => {
  it("moves focus to the confirmation that replaces the form", async () => {
    actions.sendPasswordReset.mockResolvedValue({ status: "sent", email: "anna@example.org" });
    act(() => root.render(<ForgotPasswordForm />));
    await submit(container.querySelector("form")!);
    expect(container.querySelector("form")).toBeNull();
    expect(document.activeElement?.textContent).toContain("anna@example.org");
  });
});
