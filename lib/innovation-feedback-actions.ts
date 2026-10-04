"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { saveReview, type ReviewState } from "@/lib/innovation-feedback";
import { createClient } from "@/lib/supabase/server";

export async function saveReviewAction(
  innovationId: string,
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Zaloguj się, żeby ocenić to rozwiązanie." };
  const state = await saveReview(
    await createClient(),
    user.id,
    innovationId,
    Object.fromEntries(formData),
  );
  if (state.status === "saved") revalidatePath(`/library/${innovationId}`);
  return state;
}
