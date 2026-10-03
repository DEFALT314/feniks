import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditEntry } from "@/lib/audit";
import type { CallSummary } from "@/lib/contracts/ai";
import { CallInput, type Call } from "@/lib/contracts/admin";
import type { NewNotification } from "@/lib/contracts/notifications";
import type { EmailMessage, EmailResult } from "@/lib/email";
import type { Database } from "@/lib/supabase/types";

// Calls for proposals ("nabory", #10). Table public.calls; RLS: published ones for everyone, all for ROPS.

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["calls"]["Row"];

const COLUMNS =
  "id, nazwa, organizator, cel, url, termin_od, termin_do, obszary, opublikowany, demo";

const today = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(now);

function toCall(
  r: Pick<
    Row,
    | "id"
    | "nazwa"
    | "organizator"
    | "cel"
    | "url"
    | "termin_od"
    | "termin_do"
    | "obszary"
    | "opublikowany"
    | "demo"
  >,
): Call {
  return { ...r, obszary: r.obszary ?? [] };
}

/**
 * Open calls for the application generator (P3, #18), in its CallSummary shape: published and not
 * past the deadline, nearest deadline first. Works with any client (anon or session).
 */
export async function listOpenCalls(supabase: Client, now = new Date()): Promise<CallSummary[]> {
  const { data, error } = await supabase
    .from("calls")
    .select(COLUMNS)
    .eq("opublikowany", true)
    .or(`termin_do.is.null,termin_do.gte.${today(now)}`)
    .order("termin_do", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to load calls: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.nazwa,
    organizer: c.organizator,
    goal: c.cel ?? "",
    deadline: c.termin_do,
    demo: c.demo,
  }));
}

/** Every call for the ROPS panel (RLS shows drafts to ROPS only), newest deadline last. */
export async function listAllCalls(supabase: Client): Promise<Call[]> {
  const { data, error } = await supabase
    .from("calls")
    .select(COLUMNS)
    .order("opublikowany", { ascending: false })
    .order("termin_do", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to load calls: ${error.message}`);
  return (data ?? []).map(toCall);
}

export async function getCall(supabase: Client, id: string): Promise<Call | null> {
  const { data } = await supabase.from("calls").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toCall(data) : null;
}

export type CallDeps = {
  supabase: Client;
  writeAudit: (e: AuditEntry) => Promise<unknown>;
  addNotification: (n: NewNotification) => Promise<unknown>;
  sendEmail: (m: EmailMessage) => Promise<EmailResult>;
  siteUrl: string;
};

export type CallFormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof CallInput, string>>;
  notified?: number;
};

const optional = (v: FormDataEntryValue | null | undefined) =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/** Parses the /admin/calls form (FormData entries; obszary may repeat). */
export function parseCallForm(form: FormData) {
  return CallInput.safeParse({
    id: form.get("id") ?? "",
    nazwa: form.get("nazwa") ?? "",
    organizator:
      optional(form.get("organizator")) ?? "Regionalny Ośrodek Polityki Społecznej w Krakowie",
    cel: optional(form.get("cel")),
    url: optional(form.get("url")),
    termin_od: optional(form.get("termin_od")),
    termin_do: optional(form.get("termin_do")),
    obszary: form.getAll("obszary").filter((v): v is string => typeof v === "string" && v !== ""),
    opublikowany: form.get("opublikowany") === "on",
  });
}

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export const formatDate = (iso: string | null) =>
  iso ? DATE.format(new Date(`${iso}T00:00:00Z`)) : "bez terminu";

/**
 * Adds or updates a call. When a call is published or the deadline of a published call changes,
 * the authors of sent ideas in its challenge areas get a notification and an e-mail (#10).
 * Side effects are best effort.
 */
export async function saveCall(
  deps: CallDeps,
  form: FormData,
  editingId: string | null,
): Promise<CallFormState> {
  const parsed = parseCallForm(form);
  if (!parsed.success) {
    const fieldErrors: CallFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CallInput;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors };
  }
  const c = parsed.data;
  const before = editingId ? await getCall(deps.supabase, editingId) : null;
  if (editingId && !before) return { status: "error", message: "Nie znaleziono tego naboru." };

  const row = {
    nazwa: c.nazwa,
    organizator: c.organizator,
    cel: c.cel ?? null,
    url: c.url ?? null,
    termin_od: c.termin_od ?? null,
    termin_do: c.termin_do ?? null,
    obszary: c.obszary,
    opublikowany: c.opublikowany,
  };
  const { error } = editingId
    ? await deps.supabase.from("calls").update(row).eq("id", editingId)
    : await deps.supabase.from("calls").insert({ id: c.id, ...row });
  if (error) {
    const duplicate = error.code === "23505";
    return {
      status: "error",
      message: duplicate
        ? "Nabór o tym identyfikatorze już istnieje."
        : "Nie udało się zapisać naboru.",
    };
  }

  const id = editingId ?? c.id;
  const deadlineMoved = Boolean(before && before.termin_do !== row.termin_do);
  // Switched on now: a new published call, or a hidden one published in this edit
  const justPublished = c.opublikowany && !before?.opublikowany;
  const effects: Promise<unknown>[] = [
    deps.writeAudit({
      akcja: editingId ? "nabor.edycja" : "nabor.dodanie",
      obiekt: `calls:${id}`,
      szczegoly: {
        nazwa: c.nazwa,
        termin_do: row.termin_do,
        poprzedni_termin: before?.termin_do ?? null,
        opublikowany: c.opublikowany,
      },
    }),
  ];

  let notified: number | undefined;
  if (c.opublikowany && (justPublished || deadlineMoved)) {
    notified = await notifyCallAuthors(
      deps,
      { ...row, id },
      justPublished ? { kind: "published" } : { kind: "deadline", before: before!.termin_do },
      effects,
    );
  }

  for (const r of await Promise.allSettled(effects)) {
    if (r.status === "rejected") console.error("call side effect failed", r.reason);
  }
  return {
    status: "saved",
    message: editingId ? "Zapisano zmiany." : "Dodano nabór.",
    notified,
  };
}

type CallChange = { kind: "published" } | { kind: "deadline"; before: string | null };

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * Tells the authors of sent ideas in the call's challenge areas about a new call or a moved
 * deadline (#10): a notification in the app and an e-mail. Queues the side effects in `effects`
 * and returns how many authors were found.
 */
async function notifyCallAuthors(
  deps: CallDeps,
  call: { id: string; nazwa: string; termin_do: string | null; obszary: string[] },
  change: CallChange,
  effects: Promise<unknown>[],
): Promise<number> {
  if (call.obszary.length === 0) return 0;
  const { data: authors } = await deps.supabase.rpc("call_matching_authors", {
    p_obszary: call.obszary,
  });
  const list = authors ?? [];
  if (list.length === 0) return 0;

  const deadline = formatDate(call.termin_do);
  const tytul =
    change.kind === "published"
      ? clip(`Nowy nabór „${call.nazwa}”, termin: ${deadline}`, 200)
      : clip(`Zmiana terminu naboru „${call.nazwa}”: ${deadline}`, 200);
  effects.push(
    deps.addNotification({
      userIds: list.map((a) => a.user_id),
      typ: change.kind === "published" ? "nabor_nowy" : "nabor_termin",
      tytul,
      link: "/my/creator",
    }),
  );
  for (const a of list) {
    if (!a.email) continue;
    effects.push(
      deps.sendEmail({
        to: a.email,
        subject: tytul,
        heading: change.kind === "published" ? "Ruszył nowy nabór" : "Zmienił się termin naboru",
        paragraphs: [
          `Nabór „${call.nazwa}” pasuje do Twojego pomysłu „${a.tytul}”.`,
          change.kind === "published"
            ? `Termin: ${deadline}. W kreatorze przygotujesz szkic wniosku pod ten nabór.`
            : `Nowy termin: ${deadline} (wcześniej: ${formatDate(change.before)}).`,
        ],
        action: { label: "Przygotuj wniosek", url: `${deps.siteUrl}/my/creator` },
      }),
    );
  }
  return list.length;
}

/** Publishes or hides a call ("włączanie naborów"). Switching one on tells matching authors. */
export async function setPublished(deps: CallDeps, id: string, on: boolean) {
  const before = on ? await getCall(deps.supabase, id) : null;
  const { error } = await deps.supabase.from("calls").update({ opublikowany: on }).eq("id", id);
  if (error) return false;
  const effects: Promise<unknown>[] = [
    deps.writeAudit({
      akcja: on ? "nabor.wlaczenie" : "nabor.wylaczenie",
      obiekt: `calls:${id}`,
      ...(before ? { szczegoly: { nazwa: before.nazwa } } : {}),
    }),
  ];
  if (on && before && !before.opublikowany) {
    await notifyCallAuthors(deps, before, { kind: "published" }, effects);
  }
  for (const r of await Promise.allSettled(effects)) {
    if (r.status === "rejected") console.error("call side effect failed", r.reason);
  }
  return true;
}
