"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { summarizeFeedback, type FeedbackSummary } from "../_lib/feedback-summary";
import {
  createInnovationTest,
  loadInnovationOpinions,
  loadTestOpinions,
  type NewTestState,
} from "../_lib/tests";

async function ropsClient() {
  // Server actions are public endpoints: check the role again (the layout is not enough).
  const user = await getCurrentUser();
  return user && isRopsRole(user.role) ? await createClient() : null;
}

export async function createTestAction(
  _prev: NewTestState,
  formData: FormData,
): Promise<NewTestState> {
  const supabase = await ropsClient();
  if (!supabase) return { status: "error", message: "Tylko pracownicy ROPS mogą zakładać testy." };
  const state = await createInnovationTest(supabase, (e) => writeAudit(e, supabase), formData);
  if (state.status === "saved") revalidatePath("/admin/tests");
  return { status: state.status, message: state.message, fieldErrors: state.fieldErrors };
}

export type SummaryState = {
  status: "idle" | "done" | "error";
  summary?: FeedbackSummary;
  message?: string;
};

export async function summarizeAction(target: {
  kind: "test" | "innovation";
  id: string;
  subject: string;
}): Promise<SummaryState> {
  const supabase = await ropsClient();
  if (!supabase) return { status: "error", message: "Tylko dla ROPS." };
  const opinions =
    target.kind === "test"
      ? await loadTestOpinions(supabase, target.id)
      : await loadInnovationOpinions(supabase, target.id);
  try {
    const summary = await summarizeFeedback(target.subject, opinions);
    if (!summary)
      return { status: "error", message: "Do podsumowania potrzebne są co najmniej 2 opinie." };
    return { status: "done", summary };
  } catch (error) {
    console.error("feedback summary failed", error);
    return {
      status: "error",
      message: "AI nie odpowiada. Spróbuj za chwilę albo przeczytaj opinie poniżej.",
    };
  }
}
