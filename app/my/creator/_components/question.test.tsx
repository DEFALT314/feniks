import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fields } from "../_lib/canvas";
import { Question } from "./question";

const field = (id: string) => fields.find((f) => f.id === id)!;
const render = (id: string, answer?: Parameters<typeof Question>[0]["answer"]) =>
  renderToStaticMarkup(<Question field={field(id)} answer={answer} onChange={() => {}} />);

describe("Question", () => {
  it("asks a single-choice question as a group of radios with a legend", () => {
    const html = render("intensywnosc", { choice: "Mocno przeszkadza" });
    expect(html).toContain("<legend");
    expect(html).toContain("Jak bardzo źle jest bez waszego rozwiązania?");
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    const chosen = html.match(/<input[^>]*value="Mocno przeszkadza"[^>]*>/)?.[0];
    expect(chosen).toContain('checked=""');
    expect(html.match(/checked=""/g)).toHaveLength(1);
  });

  it("disables more options once three are picked", () => {
    const options = field("wartosc-emocjonalna").opcje!;
    const html = render("wartosc-emocjonalna", { choices: options.slice(0, 3) });
    expect(html.match(/type="checkbox"/g)).toHaveLength(options.length);
    expect(html.match(/disabled=""/g)).toHaveLength(options.length - 3);
    expect(html).toContain("Zaznaczono 3 z 3.");
  });

  it("asks for the other option's text only when 'inne' is checked", () => {
    expect(render("koszty-stale", { choices: [] })).not.toContain("Co jeszcze?");
    expect(render("koszty-stale", { choices: ["inne"] })).toContain("Co jeszcze?");
  });

  it("shows one radio group per matrix column", () => {
    const html = render("wplyw", { cells: { Osoba: "Silny" } });
    expect(html.match(/<legend/g)).toHaveLength(1 + field("wplyw").kolumny!.length);
  });
});
