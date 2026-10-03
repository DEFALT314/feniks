import "server-only";

// Transactional e-mail through Resend (RESEND_API_KEY). Server-side only.
// Without a verified domain Resend delivers only to the account owner's address; set EMAIL_FROM
// once a domain is verified (e.g. "HubMI.pl <powiadomienia@hubmi.pl>").
const DEFAULT_FROM = "HubMI.pl <onboarding@resend.dev>";

export type EmailMessage = {
  to: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
};

export type EmailResult = { sent: true; id: string } | { sent: false; reason: string };

type Env = Record<string, string | undefined>;

// Demo accounts use example.org, which can never receive mail; skip them instead of failing.
export function isDeliverable(address: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address) && !/@example\.(org|com|net)$/i.test(address);
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

// Same plain, large-type layout as the sign-in code e-mail.
export function renderEmail(message: EmailMessage): { html: string; text: string } {
  const p = message.paragraphs
    .map((t) => `<p style="margin:0 0 12px">${escapeHtml(t)}</p>`)
    .join("");
  const button = message.action
    ? `<p style="margin:20px 0"><a href="${escapeHtml(message.action.url)}" style="display:inline-block;background:#1F3A8A;color:#ffffff;font-weight:bold;text-decoration:none;padding:14px 22px;border-radius:10px">${escapeHtml(message.action.label)}</a></p>`
    : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:#151A23;max-width:560px"><h2 style="color:#1F3A8A;margin:0 0 16px">${escapeHtml(message.heading)}</h2>${p}${button}<p style="margin:16px 0 0;color:#4B5565;font-size:16px">Małopolski Hub Innowacji Społecznych</p></div>`;
  const text = [
    message.heading,
    "",
    ...message.paragraphs,
    ...(message.action ? ["", `${message.action.label}: ${message.action.url}`] : []),
  ].join("\n");
  return { html, text };
}

/**
 * Sends one e-mail. Never throws: a failed e-mail must not undo the action that triggered it
 * (the in-app notification is still there). Returns why it was not sent, for logs and tests.
 */
export async function sendEmail(
  message: EmailMessage,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) return { sent: false, reason: "not-configured" };
  if (!isDeliverable(message.to)) return { sent: false, reason: "undeliverable-address" };

  const { html, text } = renderEmail(message);
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        html,
        text,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) return { sent: false, reason: body.message ?? `http-${res.status}` };
    return { sent: true, id: body.id };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : "network-error" };
  }
}

// Absolute links in e-mails: the deployment's public address.
export function siteUrl(env: Env = process.env): string {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
