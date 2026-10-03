import { redirect } from "next/navigation";
import { adminAccess, getCurrentUser } from "@/lib/auth";

// The real security boundary for /admin/*: the role is checked on the server for every request.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const access = adminAccess(await getCurrentUser());
  if (access === "sign-in") redirect("/login?next=/admin");
  if (access === "forbidden") redirect("/");
  return children;
}
