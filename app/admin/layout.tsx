import { requireRops } from "@/lib/auth/require-rops";

// /admin/* is for ROPS staff. Every page calls requireRops() too, because a layout renders in
// parallel with its page and cannot stop it on its own.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRops();
  return children;
}
