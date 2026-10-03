import { z } from "zod";
import fixture from "./fixtures/_example.json";

// Contract template. Copy to lib/contracts/<module>.ts and rename.
// Endpoint: POST /api/przyklad

export const ExampleInput = z.object({
  opis: z.string().min(10).max(2000),
});
export type ExampleInput = z.infer<typeof ExampleInput>;

export const ExampleOutput = z.object({
  id: z.string(),
  nazwa: z.string(),
  tagi: z.array(z.string()),
  utworzono: z.iso.datetime(),
});
export type ExampleOutput = z.infer<typeof ExampleOutput>;

// Sample data checked against the schema: a mistake in fixtures shows up immediately.
export const exampleFixture: ExampleOutput = ExampleOutput.parse(fixture);
