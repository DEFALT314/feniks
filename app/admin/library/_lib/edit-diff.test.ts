import { describe, expect, it } from "vitest";
import fixtures from "@/lib/contracts/fixtures/knowledge-base.json";
import { Innovation, InnovationEdit } from "@/lib/contracts/knowledge-base";
import { editFromForm, formFromInnovation } from "./edit-diff";

const original = Innovation.parse(fixtures.innovation);

describe("editing a card in the ROPS panel", () => {
  it("an untouched form sends no changes", () => {
    expect(editFromForm(original, formFromInnovation(original))).toEqual({});
  });

  it("sends only the changed fields and passes the contract", () => {
    const form = {
      ...formFromInnovation(original),
      opis_krotki: "  Nowy opis  ",
      opublikowana: false,
    };
    const edit = editFromForm(original, form);
    expect(edit).toEqual({ opis_krotki: "Nowy opis", opublikowana: false });
    expect(InnovationEdit.safeParse(edit).success).toBe(true);
  });

  it("splits lists by line and keywords by comma, dropping empty items", () => {
    const form = {
      ...formFromInnovation(original),
      dla_kogo: "seniorzy\n\n  opiekunowie  \n",
      slowa_kluczowe: "pamięć, , demencja\nruch",
    };
    const edit = editFromForm(original, form);
    expect(edit.dla_kogo).toEqual(["seniorzy", "opiekunowie"]);
    expect(edit.slowa_kluczowe).toEqual(["pamięć", "demencja", "ruch"]);
  });

  it("an emptied text becomes null and other materials are kept", () => {
    const edit = editFromForm(original, { ...formFromInnovation(original), film: " " });
    expect(edit.materialy?.film).toBeNull();
    expect(edit.materialy?.inne).toEqual(original.materialy.inne);
    expect(edit.materialy?.pakiet_zip).toEqual(original.materialy.pakiet_zip);
  });
});
