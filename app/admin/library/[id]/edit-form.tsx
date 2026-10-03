"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { Category, Innovation } from "@/lib/contracts/knowledge-base";
import { editFromForm, formFromInnovation, type InnovationForm } from "../_lib/edit-diff";

type Status =
  { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

type TextKey = {
  [K in keyof InnovationForm]: InnovationForm[K] extends string ? K : never;
}[keyof InnovationForm];

const CHECKBOXES = [
  ["opublikowana", "Opublikowana w Bibliotece"],
  ["sprawdzona_przez_rops", "Wybrana do upowszechniania (etykieta „Sprawdzona przez ROPS”)"],
  ["do_matchmakingu", "Bierze udział w dopasowaniu"],
] as const;

// Edits a card through PATCH /api/innovations/[id]; only changed fields are sent
export function EditForm({
  innovation,
  categories,
}: {
  innovation: Innovation;
  categories: Category[];
}) {
  const [saved, setSaved] = useState(innovation);
  const [form, setForm] = useState<InnovationForm>(() => formFromInnovation(innovation));
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const update = (changes: Partial<InnovationForm>) => {
    setForm((f) => ({ ...f, ...changes }));
    setStatus({ kind: "idle" });
  };
  const text = (key: TextKey) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => update({ [key]: e.target.value }),
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    const changes = editFromForm(saved, form);
    if (Object.keys(changes).length === 0) {
      setStatus({ kind: "error", message: "Nic nie zmieniono." });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const res = await fetch(`/api/innovations/${encodeURIComponent(saved.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(changes),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: body.error ?? "Nie udało się zapisać zmian." });
        return;
      }
      setSaved(body as Innovation);
      setForm(formFromInnovation(body as Innovation));
      setStatus({ kind: "saved" });
    } catch {
      setStatus({ kind: "error", message: "Brak połączenia. Spróbuj ponownie." });
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6" noValidate>
      <Field label="Nazwa">{(p) => <Input {...p} required {...text("nazwa")} />}</Field>
      <Field label="Kategoria">
        {(p) => (
          <select
            {...p}
            value={form.kategoria_id}
            onChange={(e) => update({ kategoria_id: e.target.value })}
            className="border-input text-ink focus:border-navy min-h-[50px] rounded-[10px] border bg-white px-3 text-lg"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nazwa}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Na czym polega">
        {(p) => <Textarea {...p} rows={4} {...text("opis_krotki")} />}
      </Field>
      <Field label="Jaki problem rozwiązuje">
        {(p) => <Textarea {...p} rows={4} {...text("problem")} />}
      </Field>
      <Field label="Dla kogo" hint="Każda grupa w osobnej linii.">
        {(p) => <Textarea {...p} rows={4} {...text("dla_kogo")} />}
      </Field>
      <Field label="Kto może wdrożyć" hint="Każdy podmiot w osobnej linii.">
        {(p) => <Textarea {...p} rows={4} {...text("kto_moze_wdrozyc")} />}
      </Field>
      <Field label="Czy to działa">
        {(p) => <Textarea {...p} rows={3} {...text("czy_dziala")} />}
      </Field>
      <Field
        label="Słowa kluczowe"
        hint="Oddziel przecinkami. Pomagają w wyszukiwaniu i dopasowaniu."
      >
        {(p) => <Textarea {...p} rows={2} {...text("slowa_kluczowe")} />}
      </Field>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-2 text-xl font-bold">Materiały (adresy stron)</legend>
        <Field label="Film (YouTube)">{(p) => <Input {...p} type="url" {...text("film")} />}</Field>
        <Field label="Opis modelu (PDF)">
          {(p) => <Input {...p} type="url" {...text("opis_pdf")} />}
        </Field>
        <Field label="Pakiet materiałów (ZIP)">
          {(p) => <Input {...p} type="url" {...text("pakiet_zip")} />}
        </Field>
        <Field label="Zasady wykorzystania">
          {(p) => <Input {...p} type="url" {...text("zasady_wykorzystania")} />}
        </Field>
        <Field label="Pełna karta na stronie ROPS">
          {(p) => <Input {...p} type="url" {...text("url")} />}
        </Field>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-2 text-xl font-bold">Widoczność</legend>
        {CHECKBOXES.map(([key, label]) => (
          <label
            key={key}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-[1.0625rem]"
          >
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => update({ [key]: e.target.checked })}
              className="accent-navy size-5"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Zapisywanie…" : "Zapisz zmiany"}
        </Button>
        <p role="status" aria-live="polite" className="m-0 text-base font-bold">
          {status.kind === "saved" ? (
            <span className="text-success">
              Zapisano. Karta w Bibliotece jest już zaktualizowana.
            </span>
          ) : null}
          {status.kind === "error" ? <span className="text-danger">{status.message}</span> : null}
        </p>
      </div>
    </form>
  );
}
