// Pure helpers for what a screen-reader user hears in a conversation (WCAG 4.1.3, 3.3.1).

export type LastMessage = {
  threadId: string;
  id: string | null;
  mine: boolean;
  author: string;
  text: string;
};

const EXCERPT = 100;

/**
 * Text to announce when the open conversation gets a new message from someone else, or null:
 * nothing on the first render, after switching to another conversation, or for my own message
 * (the reply form already says "Wiadomość wysłana.").
 */
export function newMessageAnnouncement(
  previous: LastMessage | null,
  next: LastMessage,
): string | null {
  if (!previous || previous.threadId !== next.threadId) return null;
  if (!next.id || previous.id === next.id || next.mine) return null;
  const text = next.text.replace(/\s+/g, " ").trim();
  const excerpt = text.length > EXCERPT ? `${text.slice(0, EXCERPT - 1).trimEnd()}…` : text;
  return excerpt
    ? `Nowa wiadomość od ${next.author}: ${excerpt}`
    : `Nowa wiadomość od ${next.author}`;
}

/** Which field a server error belongs to; null means a message for the whole form. */
export function errorField(message: string | undefined): "temat" | "tresc" | null {
  if (!message) return null;
  if (message.startsWith("Napisz temat")) return "temat";
  if (message.startsWith("Napisz wiadomość")) return "tresc";
  return null;
}
