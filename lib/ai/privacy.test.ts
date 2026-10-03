import { describe, expect, it } from "vitest";
import { REDACTED, redactPersonalData } from "./privacy";

describe("redactPersonalData", () => {
  it.each([
    ["phone with prefix", "dzwońcie: tel. 600 123 456", "dzwońcie: •••"],
    ["phone with country code", "kontakt +48 600-123-456", "kontakt •••"],
    ["e-mail", "pisz na anna.nowak@gmail.com", "pisz na •••"],
    ["PESEL with label", "PESEL 85010112345", "•••"],
    ["bank account", "konto PL61 1090 1014 0000 0712 1981 2874", "konto •••"],
  ])("removes %s", (_, input, expected) => {
    expect(redactPersonalData(input)).toBe(expected);
  });

  it("keeps ordinary numbers and the description", () => {
    const text = "W gminie mamy 120 seniorów i 3 świetlice, autobus jeździ 2 razy dziennie.";
    expect(redactPersonalData(text)).toBe(text);
  });

  it("uses a marker that is not a word", () => {
    expect(REDACTED).not.toMatch(/\p{L}/u);
  });
});
