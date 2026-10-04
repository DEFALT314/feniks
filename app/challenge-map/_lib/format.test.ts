import { describe, expect, it } from "vitest";
import { challengeMapTitle, formatChallengeCount } from "./format";

describe("formatChallengeCount", () => {
  it("uses Polish plural forms", () => {
    expect(formatChallengeCount(1)).toBe("1 wyzwanie");
    expect(formatChallengeCount(4)).toBe("4 wyzwania");
    expect(formatChallengeCount(6)).toBe("6 wyzwań");
    expect(formatChallengeCount(13)).toBe("13 wyzwań");
  });
});

describe("challengeMapTitle", () => {
  it("names the picked area", () => {
    expect(challengeMapTitle("Bezdomność")).toBe("Bezdomność – Mapa wyzwań społecznych – HubMI.pl");
  });

  it("is the plain title without a pick", () => {
    expect(challengeMapTitle(null)).toBe("Mapa wyzwań społecznych – HubMI.pl");
  });
});
