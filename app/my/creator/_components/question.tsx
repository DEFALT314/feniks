"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceTile } from "@/components/ui/choice-tile";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { CanvasAnswer, CanvasField } from "@/lib/contracts/idea-creator";

type QuestionProps = {
  field: CanvasField;
  answer: CanvasAnswer | undefined;
  onChange: (answer: CanvasAnswer) => void;
};

const OTHER = "inne";

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
export function Question({ field, answer, onChange }: QuestionProps) {
  const title = field.pytanie ?? field.nazwa;
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="font-heading mb-1.5 text-[2rem] leading-tight font-bold tracking-tight">
        {title}
      </legend>
      <p className="text-muted-foreground mb-1">{INSTRUCTIONS[field.typ]}</p>
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
            <Field label="Opisz krótko" className="mt-2">
              {(control) => (
                <Textarea
                  {...control}
                  rows={2}
                  maxLength={500}
                  value={text}
                  disabled={!choice}
                  onChange={(e) => onChange({ choice, text: e.target.value })}
                />
              )}
            </Field>
          ) : null}
        </>
      );
    }

    case "wiele_wyborow":
    case "wiele_wyborow_max3": {
      const choices = answer && "choices" in answer ? answer.choices : [];
      const other = answer && "choices" in answer ? (answer.other ?? "") : "";
      const full = field.typ === "wiele_wyborow_max3" && choices.length >= 3;
      const toggle = (option: string, on: boolean) => {
        const next = on ? [...choices, option] : choices.filter((c) => c !== option);
        onChange(next.includes(OTHER) && other ? { choices: next, other } : { choices: next });
      };
      return (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((option) => {
              const checked = choices.includes(option);
              return (
                <ChoiceTile
                  key={option}
                  type="checkbox"
                  size="compact"
                  value={option}
                  title={option}
                  checked={checked}
                  disabled={!checked && full}
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
          {field.typ === "wiele_wyborow_max3" ? (
            <p aria-live="polite" className="text-muted-foreground text-base">
              Zaznaczono {choices.length} z 3.
            </p>
          ) : null}
        </>
      );
    }

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

type PartnerRow = { name: string; axis: string; status: string };

// Rows are edited locally; only rows with a name are saved
function PartnersInput({ field, answer, onChange }: QuestionProps) {
  const axes = field.osie ?? [];
  const statuses = field.status ?? [];
  const saved = answer && "partners" in answer ? answer.partners : [];
  const [rows, setRows] = useState<PartnerRow[]>(
    saved.length ? saved : [{ name: "", axis: axes[0] ?? "", status: statuses[0] ?? "" }],
  );

  const update = (next: PartnerRow[]) => {
    setRows(next);
    onChange({
      partners: next
        .filter((row) => row.name.trim() !== "")
        .map((row) => ({ ...row, name: row.name.trim() })),
    });
  };
  const change = (index: number, patch: Partial<PartnerRow>) =>
    update(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, index) => (
        <div
          key={index}
          className="border-border flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
        >
          <Field label={`Partner ${index + 1}`} className="min-w-0 flex-[2_1_220px]">
            {(control) => (
              <Input
                {...control}
                maxLength={500}
                value={row.name}
                onChange={(e) => change(index, { name: e.target.value })}
              />
            )}
          </Field>
          <Field label="W czym pomoże" className="flex-[1_1_150px]">
            {(control) => (
              <select
                {...control}
                className="border-input min-h-[50px] w-full rounded-[10px] border bg-white px-3 text-lg"
                value={row.axis}
                onChange={(e) => change(index, { axis: e.target.value })}
              >
                {axes.map((axis) => (
                  <option key={axis}>{axis}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Status" className="flex-[1_1_150px]">
            {(control) => (
              <select
                {...control}
                className="border-input min-h-[50px] w-full rounded-[10px] border bg-white px-3 text-lg"
                value={row.status}
                onChange={(e) => change(index, { status: e.target.value })}
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
            aria-label={`Usuń partnera ${index + 1}`}
            onClick={() => update(rows.filter((_, i) => i !== index))}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      {rows.length < 20 ? (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() =>
            update([...rows, { name: "", axis: axes[0] ?? "", status: statuses[0] ?? "" }])
          }
        >
          Dodaj partnera
        </Button>
      ) : null}
    </div>
  );
}
