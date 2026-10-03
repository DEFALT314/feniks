import { describe, expect, it } from "vitest";
import { errorField, newMessageAnnouncement, type LastMessage } from "./announce";

const last = (over: Partial<LastMessage> = {}): LastMessage => ({
  threadId: "t1",
  id: "m1",
  mine: false,
  author: "Redakcja ROPS",
  text: "Dzień dobry",
  ...over,
});

describe("newMessageAnnouncement", () => {
  it("announces a new message from the other side with its author", () => {
    expect(newMessageAnnouncement(last(), last({ id: "m2", text: "Mamy odpowiedź" }))).toBe(
      "Nowa wiadomość od Redakcja ROPS: Mamy odpowiedź",
    );
  });

  it("stays silent for my own message, the first render and the same message", () => {
    expect(newMessageAnnouncement(last(), last({ id: "m2", mine: true }))).toBeNull();
    expect(newMessageAnnouncement(null, last())).toBeNull();
    expect(newMessageAnnouncement(last(), last())).toBeNull();
  });

  it("stays silent after switching to another conversation", () => {
    expect(newMessageAnnouncement(last(), last({ threadId: "t2", id: "m9" }))).toBeNull();
  });

  it("shortens a long message", () => {
    const text = "a ".repeat(200);
    const said = newMessageAnnouncement(last(), last({ id: "m2", text }))!;
    expect(said.length).toBeLessThan(140);
    expect(said.endsWith("…")).toBe(true);
  });
});

describe("errorField", () => {
  it("ties validation errors to their field and keeps the rest form-level", () => {
    expect(errorField("Napisz temat (do 200 znaków).")).toBe("temat");
    expect(errorField("Napisz wiadomość (do 5000 znaków).")).toBe("tresc");
    expect(errorField("Nie udało się wysłać wiadomości. Spróbuj ponownie.")).toBeNull();
    expect(errorField(undefined)).toBeNull();
  });
});
