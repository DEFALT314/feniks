import { describe, expect, it } from "vitest";
import library from "@/data/rops/biblioteka.json";
import { embedUrl, youTubeId } from "./youtube";

describe("YouTube links on innovation cards", () => {
  it("reads the id from the common link formats", () => {
    expect(youTubeId("https://www.youtube.com/watch?v=o7UhDlebLJo")).toBe("o7UhDlebLJo");
    expect(youTubeId("https://youtu.be/o7UhDlebLJo?t=10")).toBe("o7UhDlebLJo");
    expect(youTubeId("https://m.youtube.com/watch?v=o7UhDlebLJo&feature=share")).toBe(
      "o7UhDlebLJo",
    );
    expect(youTubeId("https://www.youtube.com/embed/o7UhDlebLJo")).toBe("o7UhDlebLJo");
    expect(youTubeId("https://www.youtube.com/shorts/o7UhDlebLJo")).toBe("o7UhDlebLJo");
  });

  it("rejects other sites, broken links and malformed ids", () => {
    expect(youTubeId(null)).toBeNull();
    expect(youTubeId("not a url")).toBeNull();
    expect(youTubeId("https://vimeo.com/123456")).toBeNull();
    expect(youTubeId("https://evil.example/watch?v=o7UhDlebLJo")).toBeNull();
    expect(youTubeId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(youTubeId('https://www.youtube.com/watch?v=o7UhDlebLJ"')).toBeNull();
  });

  it("every film link in the ROPS Library gives a player", () => {
    const films = library.innowacje.map((i) => i.materialy.film).filter(Boolean) as string[];
    expect(films.length).toBe(26);
    expect(films.every((f) => youTubeId(f) !== null)).toBe(true);
  });

  it("embeds without tracking cookies and with captions", () => {
    const url = embedUrl("o7UhDlebLJo");
    expect(url.startsWith("https://www.youtube-nocookie.com/embed/o7UhDlebLJo")).toBe(true);
    expect(url).toContain("cc_load_policy=1");
  });
});
