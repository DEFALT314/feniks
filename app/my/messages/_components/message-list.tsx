import type { ThreadMessage } from "@/lib/messaging";
import { cn } from "@/lib/utils";
import { time } from "../_lib/format";

const authorKey = (m: ThreadMessage) => (m.mine ? "me" : (m.autor_id ?? m.autor_nazwa ?? "rops"));

// Chat bubbles like in a messenger: your messages on the right (navy), the other side on the left
// (grey) with its name above each run of messages. Screen readers still hear who wrote each one.
export function MessageList({ messages }: { messages: ThreadMessage[] }) {
  return (
    <ol aria-label="Wiadomości" className="m-0 flex list-none flex-col p-0 py-3">
      {messages.map((m, i) => {
        const author = m.mine ? "Ty" : (m.autor_nazwa ?? "ROPS");
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const firstOfRun = !prev || authorKey(prev) !== authorKey(m);
        const lastOfRun = !next || authorKey(next) !== authorKey(m);
        return (
          <li
            key={m.id}
            className={cn(
              "flex flex-col",
              m.mine ? "items-end" : "items-start",
              firstOfRun && i > 0 ? "mt-4" : "mt-1",
            )}
          >
            <span
              className={cn(
                "text-muted-foreground mb-1 px-3 text-sm font-bold",
                (m.mine || !firstOfRun) && "sr-only",
              )}
            >
              {author}
            </span>
            <p
              className={cn(
                "m-0 max-w-[min(75%,36rem)] rounded-[20px] px-4 py-2.5 break-words whitespace-pre-line",
                m.mine ? "bg-navy text-white" : "bg-neutral-soft text-ink",
                m.mine && lastOfRun && "rounded-br-md",
                !m.mine && lastOfRun && "rounded-bl-md",
              )}
            >
              {m.tresc}
            </p>
            <time
              dateTime={m.created_at}
              className={cn("text-muted-foreground px-3 pt-1 text-sm", !lastOfRun && "sr-only")}
            >
              {time(m.created_at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
