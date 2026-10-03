import type { TesterTest } from "@/lib/contracts/innovation-tester";
import { formatTermin, seatsLabel } from "../_lib/model";

// "Gdzie / Kiedy / Miejsca" of a test (dl.m in design/makiety/Tester.dc.html)
export function TestDetails({ test }: { test: TesterTest }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base">
      <dt className="text-muted-foreground">Gdzie</dt>
      <dd className="m-0">{test.miejsce ?? "do ustalenia"}</dd>
      <dt className="text-muted-foreground">Kiedy</dt>
      <dd className="m-0">{formatTermin(test.termin)}</dd>
      <dt className="text-muted-foreground">Miejsca</dt>
      <dd className="m-0">{seatsLabel(test)}</dd>
    </dl>
  );
}
