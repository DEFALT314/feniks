"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendReply, startConversation } from "@/lib/messaging";
import { messagingDeps } from "./deps";

export type FormState = { error?: string; sentAt?: number };

export async function replyAction(
  threadId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const deps = await messagingDeps();
  if (!deps) return { error: "Zaloguj się, żeby odpowiedzieć." };
  const result = await sendReply(deps, threadId, formData.get("tresc"));
  if (!result.ok) return { error: result.message };
  revalidatePath("/my/messages");
  return { sentAt: Date.now() };
}

export async function startAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const deps = await messagingDeps();
  if (!deps) return { error: "Zaloguj się, żeby napisać do ROPS." };
  const text = (k: string) =>
    typeof formData.get(k) === "string" && formData.get(k) ? String(formData.get(k)) : null;
  const result = await startConversation(deps, {
    temat: formData.get("temat"),
    tresc: formData.get("tresc"),
    ideaId: text("idea"),
    innowacjaId: text("innovation"),
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/my/messages");
  redirect(`/my/messages?thread=${result.threadId}`);
}
