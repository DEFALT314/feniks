import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field, fieldControlProps } from "./field";
import { Input } from "./input";

describe("fieldControlProps", () => {
  it("only sets the id when there is no hint or error", () => {
    expect(fieldControlProps("email", false, false)).toEqual({ id: "email" });
  });

  it("links the hint and the error and marks the control invalid", () => {
    expect(fieldControlProps("email", true, true)).toEqual({
      id: "email",
      "aria-describedby": "email-hint email-error",
      "aria-invalid": true,
    });
  });
});

describe("Field", () => {
  it("connects the label, hint and error to the control", () => {
    const html = renderToStaticMarkup(
      <Field id="email" label="Adres e-mail" hint="Nie podawaj imion." error="Wpisz poprawny adres">
        {(control) => <Input type="email" {...control} />}
      </Field>,
    );
    expect(html).toContain('<label for="email"');
    expect(html).toContain('id="email-hint"');
    expect(html).toContain('id="email-error"');
    expect(html).toMatch(/<input[^>]*id="email"[^>]*aria-describedby="email-hint email-error"/);
    expect(html).toMatch(/<input[^>]*aria-invalid="true"/);
  });

  it("generates an id when none is given", () => {
    const html = renderToStaticMarkup(
      <Field label="Opis">{(control) => <Input {...control} />}</Field>,
    );
    const id = html.match(/<label for="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toMatch(new RegExp(`<input[^>]*id="${id}"`));
    expect(html).not.toMatch(/ aria-(invalid|describedby)="/);
  });
});
