import { z } from "zod";
import type { InstitutionType, Role } from "@/lib/contracts/shared";

// Fictional demo accounts from design/makiety/Logowanie.dc.html. Never real people (CLAUDE.md, rule 8).
// E-mails use the reserved example.org domain, so no message can ever be delivered.
export const DemoAccountKey = z.enum(["mieszkaniec", "jst", "ngo", "ekspert", "rops"]);
export type DemoAccountKey = z.infer<typeof DemoAccountKey>;

export type DemoAccount = {
  key: DemoAccountKey;
  email: string;
  role: Role;
  displayName: string;
  description: string; // shown under the name on the "Wejdź jako…" list
  startPath: string; // where the demo account lands after signing in
  avatarClass: string;
  institution?: { id: string; nazwa: string; typ: InstitutionType };
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    key: "mieszkaniec",
    email: "demo.mieszkaniec@example.org",
    role: "mieszkaniec",
    displayName: "Stanisław",
    description: "mieszkaniec, opiekuje się chorą mamą",
    startPath: "/match",
    avatarClass: "bg-navy",
  },
  {
    key: "jst",
    email: "demo.gops@example.org",
    role: "jst",
    displayName: "GOPS w Przykładowej Woli",
    description: "gmina (JST), gmina wiejska",
    startPath: "/my/middleman",
    avatarClass: "bg-success",
    institution: {
      id: "d0000000-0000-4000-8000-00000000000a",
      nazwa: "GOPS w Przykładowej Woli (fikcyjny)",
      typ: "OPS",
    },
  },
  {
    key: "ngo",
    email: "demo.fundacja@example.org",
    role: "ngo",
    displayName: "Fundacja Dobry Start",
    description: "organizacja pozarządowa, autorka pomysłu",
    startPath: "/my/creator",
    avatarClass: "bg-brick",
    institution: {
      id: "d0000000-0000-4000-8000-00000000000b",
      nazwa: "Fundacja Dobry Start (fikcyjna)",
      typ: "NGO",
    },
  },
  {
    key: "ekspert",
    email: "demo.ekspert@example.org",
    role: "ekspert",
    displayName: "Ewa",
    description: "ekspertka, mentorka innowacji",
    startPath: "/my/messages",
    avatarClass: "bg-ink-muted",
  },
  {
    key: "rops",
    email: "demo.rops@example.org",
    role: "rops_admin",
    displayName: "Redakcja ROPS",
    description: "administrator, Panel ROPS",
    startPath: "/admin",
    avatarClass: "bg-ink",
  },
];

export function demoAccount(key: DemoAccountKey): DemoAccount {
  const account = DEMO_ACCOUNTS.find((a) => a.key === key);
  if (!account) throw new Error(`Unknown demo account: ${key}`);
  return account;
}

export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMO_MODE === "true";
}
