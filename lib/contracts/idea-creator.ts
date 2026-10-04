// Contract of module III Idea creator (P2): the innovation canvas, the answers, the idea card ("fiszka")
// and good practices: approved ideas the author agreed to show to everyone (#104).
// Tables: public.ideas and public.idea_canvas (migrations *_creator_tester.sql, *_creator_good_practices.sql).
// P4's ROPS panel reads ideas; P3's AI maps Idea onto IdeaDraft (lib/contracts/ai.ts).
// Sample data: lib/contracts/fixtures/idea-creator.json. After 17:00, changes only by adding fields.
import { z } from "zod";
import fixture from "./fixtures/idea-creator.json";
import { IdeaStage } from "./ai";

// --- Canvas definition (data/rops/canvas_innowacji.json) ---

export const CanvasFieldType = z.enum([
  "jeden_wybor", // one option
  "skala", // one option on a scale
  "jeden_wybor_plus_tekst", // one option and a short description
  "wiele_wyborow", // any number of options
  "wiele_wyborow_max3", // up to three options
  "tekst_lista", // free-text list, one item per line
  "lista_partnerow", // partners with an axis and a status
  "macierz", // one row per column
]);
export type CanvasFieldType = z.infer<typeof CanvasFieldType>;

// Which idea card field a canvas answer helps to write
export const CardMapping = z.enum(["opis", "dla_kogo", "istota", "etap"]);

export const CanvasField = z.object({
  id: z.string(),
  blok: z.string(),
  nazwa: z.string(),
  typ: CanvasFieldType,
  pytanie: z.string().optional(),
  opcje: z.array(z.string()).optional(),
  podpowiedzi: z.array(z.string()).optional(),
  osie: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  wiersze: z.array(z.string()).optional(),
  kolumny: z.array(z.string()).optional(),
  mapowanie_fiszki: CardMapping.nullable(),
});
export type CanvasField = z.infer<typeof CanvasField>;

export const Canvas = z.object({
  nazwa: z.string(),
  zrodlo: z.string(),
  arkusze: z.array(z.object({ nr: z.number().int(), pola: z.array(CanvasField) })),
});
export type Canvas = z.infer<typeof Canvas>;

// --- Answers (public.idea_canvas.odpowiedz). The shape depends on the field type. ---

const shortText = z.string().trim().max(500);

export const SingleChoiceAnswer = z.object({ choice: z.string() });
export const ChoiceWithTextAnswer = z.object({ choice: z.string(), text: shortText });
export const MultiChoiceAnswer = z.object({
  choices: z.array(z.string()),
  other: shortText.optional(), // text for the "inne" option
});
export const TextListAnswer = z.object({ items: z.array(shortText).max(20) });
export const PartnersAnswer = z.object({
  partners: z
    .array(z.object({ name: shortText.min(1), axis: z.string(), status: z.string() }))
    .max(20),
});
export const MatrixAnswer = z.object({ cells: z.record(z.string(), z.string()) }); // column → row

export const CanvasAnswer = z.union([
  ChoiceWithTextAnswer,
  SingleChoiceAnswer,
  MultiChoiceAnswer,
  TextListAnswer,
  PartnersAnswer,
  MatrixAnswer,
]);
export type CanvasAnswer = z.infer<typeof CanvasAnswer>;

// --- Idea card (public.ideas) ---

export const Idea = z.object({
  id: z.uuid(),
  tytul: z.string().trim().min(1).max(200),
  opis: z.string().max(3000).nullable(),
  istota: z.string().max(500).nullable(),
  dla_kogo: z.string().max(500).nullable(),
  etap: IdeaStage.nullable(),
  obszar_id: z.string().nullable(),
  wyslany_at: z.iso.datetime({ offset: true }).nullable(), // sent to ROPS
  // Good practices (#104), set only by database functions. Optional for readers of older data.
  zgoda_publikacji_at: z.iso.datetime({ offset: true }).nullable().optional(), // author's consent
  opublikowany_at: z.iso.datetime({ offset: true }).nullable().optional(), // shown by ROPS
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Idea = z.infer<typeof Idea>;

// Card fields the author edits on the card screen
export const IdeaCardInput = Idea.pick({
  tytul: true,
  opis: true,
  istota: true,
  dla_kogo: true,
  etap: true,
}).partial();
export type IdeaCardInput = z.infer<typeof IdeaCardInput>;

// An idea with its canvas answers (field id → answer)
export const IdeaWithCanvas = Idea.extend({
  answers: z.record(z.string(), CanvasAnswer),
});
export type IdeaWithCanvas = z.infer<typeof IdeaWithCanvas>;

// --- Good practice (public.dobre_praktyki()): what everyone sees of a published idea ---
// Only card fields: no author, no canvas answers (rule 8). Test results from module IV come as the
// number of ratings and their average, which the database gives only from three ratings up.

export const GoodPractice = z.object({
  id: z.uuid(),
  tytul: z.string(),
  opis: z.string().nullable(),
  istota: z.string().nullable(),
  dla_kogo: z.string().nullable(),
  etap: IdeaStage.nullable(),
  obszar_id: z.string().nullable(),
  obszar_nazwa: z.string().nullable(),
  opublikowany_at: z.iso.datetime({ offset: true }),
  liczba_ocen: z.number().int().min(0),
  srednia_ocena: z.number().min(1).max(5).nullable(),
});
export type GoodPractice = z.infer<typeof GoodPractice>;

export const IdeaCreatorFixtures = z.object({
  idea: IdeaWithCanvas,
  good_practices: z.array(GoodPractice),
});
export const ideaCreatorFixtures = IdeaCreatorFixtures.parse(fixture);
