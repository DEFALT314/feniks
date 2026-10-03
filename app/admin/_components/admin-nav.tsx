import { Badge } from "@/components/ui/badge";
import { isDemoMode } from "@/lib/auth/demo-accounts";
import { ADMIN_TABS, AdminTabs } from "./admin-tabs";

// Panel header for sub-pages: same title and tabs as /admin (app/admin/page.tsx)
export function AdminNav({ current }: { current: string }) {
  return (
    <div className="border-border border-b bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3.5 px-4 pt-8 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-heading text-[2.5rem] font-bold tracking-tight">Panel ROPS</p>
          {isDemoMode() ? <Badge variant="warning">Dane demonstracyjne</Badge> : null}
        </div>
        <AdminTabs current={current} tabs={ADMIN_TABS} />
      </div>
    </div>
  );
}
