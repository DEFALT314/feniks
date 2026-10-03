"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { Trash2 } from "lucide-react";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { ChoiceTile } from "@/components/ui/choice-tile";
import { Field } from "@/components/ui/field";
import { focusElement } from "@/components/ui/focus";
import { Input, Textarea } from "@/components/ui/input";
import type { CanvasAnswer, CanvasField } from "@/lib/contracts/idea-creator";

type QuestionProps = {
  field: CanvasField;
  answer: CanvasAnswer | undefined;
  onChange: (answer: CanvasAnswer) => void;
  disabled?: boolean; // read-only while ROPS has the idea
  /** The question heading; the wizard moves focus here after "Dalej" / "Wstecz". */
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

const OTHER = "inne";
const MAX_CHOICES = 3;

const INSTRUCTIONS: Record<CanvasField["typ"], string> = {
  jeden_wybor: "Wybierz jedną odpowiedź. Zawsze możesz wrócić i ją zmienić.",
  skala: "Wybierz jedną odpowiedź. Zawsze możesz wrócić i ją zmienić.",
  jeden_wybor_plus_tekst: "Wybierz jedną odpowiedź i dopisz kilka słów.",
  wiele_wyborow: "Zaznacz wszystko, co pasuje.",
  wiele_wyborow_max3: "Zaznacz najwyżej trzy odpowiedzi.",
  tekst_lista: "Wpisz osoby lub instytucje, każdą w osobnej linii.",
  lista_partnerow: "Dodaj partnerów: w czym pomogą i na jakim etapie są rozmowy.",
  macierz: "Dla każdej kolumny wybierz, jak duża jest zmiana.",
};

// One canvas field = one screen (design/makiety/Kreator.dc.html). Every change is saved right away.
// The question is an h2 inside the legend: it names the group and is reachable with heading
// navigation (WCAG 1.3.1, 2.4.6); the instruction is read when entering the group.
export function Question({ field, answer, onChange, disabled = false, headingRef }: QuestionProps) {
  const title = field.pytanie ?? field.nazwa;
  const instructionsId = useId();
  return (
    <fieldset
      data-ruch="wybor"
      disabled={disabled}
      aria-describedby={instructionsId}
      className="flex min-w-0 flex-col gap-3"
    >
      <legend className="mb-1.5">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-[2rem] leading-tight font-bold tracking-tight"
        >
          {title}
        </h2>
      </legend>
      <p id={instructionsId} className="text-muted-foreground mb-1">
        {INSTRUCTIONS[field.typ]}
      </p>
      <QuestionInput field={field} answer={answer} onChange={onChange} />
    </fieldset>
  );
}

function QuestionInput({ field, answer, onChange }: QuestionProps) {
  const name = useId();
  const options = field.opcje ?? [];
  switch (field.typ) {
    case "jeden_wybor":
    case "skala":
    case "jeden_wybor_plus_tekst": {
      const choice = answer && "choice" in answer ? answer.choice : "";
      const text = answer && "text" in answer ? answer.text : "";
      const withText = field.typ === "jeden_wybor_plus_tekst";
      return (
        <>
          {options.map((option) => (
            <ChoiceTile
              key={option}
              name={name}
              value={option}
              title={option}
              checked={choice === option}
              onChange={() => onChange(withText ? { choice: option, text } : { choice: option })}
            />
          ))}
          {withText ? (
            // Read-only, not disabled, until a choice is made: it stays in the Tab order and the
            // hint says why it can't be filled yet (WCAG 3.3.2)
            <Field
              label="Opisz krótko"
              hint={choice ? undefined : "Najpierw wybierz jedną odpowiedź powyżej."}
              className="mt-2"
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={2}
                  maxLength={500}
                  value={text}
                  readOnly={!choice}
                  onChange={(e) => onChange({ choice, text: e.target.value })}
                />
              )}
            </Field>
          ) : null}
        </>
      );
    }

    case "wiele_wyborow":
    case "wiele_wyborow_max3":
      return <MultiChoiceInput field={field} answer={answer} onChange={onChange} />;

    case "tekst_lista": {
      const items = answer && "items" in answer ? answer.items : [];
      return (
        <>
          {field.podpowiedzi?.length ? (
            <div className="text-muted-foreground">
              <p>Pomyśl o tym:</p>
              <ul className="list-disc pl-6">
                {field.podpowiedzi.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Field label={field.nazwa}>
            {(control) => (
              <Textarea
                {...control}
                rows={5}
                value={items.join("\n")}
                onChange={(e) => onChange({ items: e.target.value.split("\n").slice(0, 20) })}
              />
            )}
          </Field>
        </>
      );
    }

    case "lista_partnerow":
      return <PartnersInput field={field} answer={answer} onChange={onChange} />;

    case "macierz": {
      const cells = answer && "cells" in answer ? answer.cells : {};
      return (
        <div className="flex flex-col gap-5">
          {(field.kolumny ?? []).map((column) => (
            <fieldset key={column} className="flex flex-col gap-2">
              <legend className="mb-1 font-bold">{column}</legend>
              <div className="grid gap-2 sm:grid-cols-4">
                {(field.wiersze ?? []).map((row) => (
                  <ChoiceTile
                    key={row}
                    size="compact"
                    name={`${name}-${column}`}
                    value={row}
                    title={row}
                    checked={cells[column] === row}
                    onChange={() => onChange({ cells: { ...cells, [column]: row } })}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      );
    }
  }
}

// "Pick up to three": the other options stay focusable (aria-disabled, not disabled) so a keyboard
// or screen-reader user still hears them, and a 4th pick is refused with a linked hint (WCAG 2.1.1, 3.3.2)
function MultiChoiceInput({ field, answer, onChange }: QuestionProps) {
  const limitId = useId();
  const options = field.opcje ?? [];
  const choices = answer && "choices" in answer ? answer.choices : [];
  const other = answer && "choices" in answer ? (answer.other ?? "") : "";
  const limited = field.typ === "wiele_wyborow_max3";
  const full = limited && choices.length >= MAX_CHOICES;
  const toggle = (option: string, on: boolean) => {
    if (on && full) {
      announce("Możesz zaznaczyć najwyżej trzy odpowiedzi. Najpierw odznacz jedną.");
      return; // the controlled checkbox stays unchecked
    }
    const next = on ? [...choices, option] : choices.filter((c) => c !== option);
    onChange(next.includes(OTHER) && other ? { choices: next, other } : { choices: next });
    if (limited) announce(`Zaznaczono ${next.length} z ${MAX_CHOICES}.`);
  };
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = choices.includes(option);
          const blocked = !checked && full;
          return (
            <ChoiceTile
              key={option}
              type="checkbox"
              size="compact"
              value={option}
              title={option}
              checked={checked}
              aria-disabled={blocked || undefined}
              aria-describedby={blocked ? limitId : undefined}

              onChange={(e) => toggle(option, e.target.checked)}
            />
          );
        })}
      </div>
      {choices.includes(OTHER) ? (
        <Field label="Co jeszcze?">
          {(control) => (
            <Input
              {...control}
              maxLength={500}
              value={other}
              onChange={(e) => onChange({ choices, other: e.target.value })}
            />
          )}
        </Field>
      ) : null}
      {limited ? (
        <p id={limitId} className="text-muted-foreground text-base">
          Zaznaczono {choices.length} z {MAX_CHOICES}.
          {full ? " Żeby wybrać inną odpowiedź, najpierw odznacz jedną." : null}
        </p>
      ) : null}
    </>
  );
}

type PartnerRow = { id: number; name: string; axis: string; status: string };

// Stable row keys: deleting a middle row must not hand its focus or state to the next partner
let nextPartnerRowId = 0;

// Rows are edited locally; only rows with a name are saved. Each row is its own group ("Partner 2")
// and every label carries the row number, so a screen reader's list of fields tells them apart.
function PartnersInput({ field, answer, onChange }: QuestionProps) {
  const axes = field.osie ?? [];
  const statuses = field.status ?? [];
  const saved = answer && "partners" in answer ? answer.partners : [];
  const newRow = (values?: Omit<PartnerRow, "id">): PartnerRow => ({
    id: nextPartnerRowId++,
    ...(values ?? { name: "", axis: axes[0] ?? "", status: statuses[0] ?? "" }),
  });
  const [rows, setRows] = useState<PartnerRow[]>(() =>
    saved.length ? saved.map((p) => newRow(p)) : [newRow()],
  );
  // After adding a row focus goes to its name field, after removing one to "Dodaj partnera", so it
  // never falls back to the top of the page (WCAG 2.4.3)
  const nameInputs = useRef(new Map<number, HTMLInputElement>());
  const addButton = useRef<HTMLButtonElement>(null);

  const update = (next: PartnerRow[]) => {
    setRows(next);
    onChange({
      partners: next
        .filter((row) => row.name.trim() !== "")
        .map(({ name, axis, status }) => ({ name: name.trim(), axis, status })),
    });
  };
  const change = (id: number, patch: Partial<PartnerRow>) =>
    update(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const add = () => {
    const row = newRow();
    flushSync(() => update([...rows, row]));
    focusElement(nameInputs.current.get(row.id));
  };
  const remove = (id: number, number: number) => {
    flushSync(() => update(rows.filter((row) => row.id !== id)));
    focusElement(addButton.current);
    announce(`Usunięto partnera ${number}.`);
  };

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, index) => {
        const n = index + 1;
        return (
          <fieldset
            key={row.id}
            className="border-border flex min-w-0 flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
          >
            <legend className="sr-only">Partner {n}</legend>
            <Field
              label={
                <>
                  Partner {n}
                  <span className="sr-only">: nazwa</span>
                </>
              }
              className="min-w-0 flex-[2_1_220px]"
            >
              {(control) => (
                <Input
                  {...control}
                  ref={(el) => {
                    if (el) nameInputs.current.set(row.id, el);
                    else nameInputs.current.delete(row.id);
                  }}
                  maxLength={500}
                  value={row.name}
                  onChange={(e) => change(row.id, { name: e.target.value })}
                />
              )}
            </Field>
            <Field
              label={
                <>
                  W czym pomoże<span className="sr-only"> partner {n}</span>
                </>
              }
              className="flex-[1_1_150px]"
            >
              {(control) => (
                <select
                  {...control}
                  className="border-input min-h-[50px] w-full rounded-[10px] border bg-white px-3 text-lg"
                  value={row.axis}
                  onChange={(e) => change(row.id, { axis: e.target.value })}
                >
                  {axes.map((axis) => (
                    <option key={axis}>{axis}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              label={
                <>
                  Status<span className="sr-only"> partnera {n}</span>
                </>
              }
              className="flex-[1_1_150px]"
            >
              {(control) => (
                <select
                  {...control}
                  className="border-input min-h-[50px] w-full rounded-[10px] border bg-white px-3 text-lg"
                  value={row.status}
                  onChange={(e) => change(row.id, { status: e.target.value })}
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              )}
            </Field>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Usuń partnera ${n}`}
              onClick={() => remove(row.id, n)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </fieldset>
        );
      })}
      {rows.length < 20 ? (
        <Button ref={addButton} variant="secondary" className="self-start" onClick={add}>
          Dodaj partnera
        </Button>
      ) : null}
    </div>
  );
}
