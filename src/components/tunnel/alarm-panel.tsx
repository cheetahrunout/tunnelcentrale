import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTunnel } from "@/lib/tunnel/store";

function fmt(t: number): string {
  const s = Math.floor(t);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AlarmPanel() {
  const alarms = useTunnel((s) => s.snapshot.alarms);
  const incidents = useTunnel((s) => s.snapshot.incidents);
  const evacuees = useTunnel((s) => s.snapshot.evacuees);
  const counts = useTunnel((s) => s.snapshot.vehicleCount);
  const speeds = useTunnel((s) => s.snapshot.avgSpeedKmh);
  const eta = useTunnel((s) => s.snapshot.emergencyEta);
  const arrived = useTunnel((s) => s.snapshot.emergencyArrived);
  const simTime = useTunnel((s) => s.snapshot.simTime);
  const pa = useTunnel((s) => s.snapshot.systems.paMessage);
  const paOn = useTunnel((s) => s.snapshot.systems.pa);
  const ack = useTunnel((s) => s.ack);
  const ackAll = useTunnel((s) => s.ackAll);

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
        <Kpi label="EB traffic" value={`${counts.eastbound}`} sub={`${Math.round(speeds.eastbound)} km/h`} />
        <Kpi label="WB traffic" value={`${counts.westbound}`} sub={`${Math.round(speeds.westbound)} km/h`} />
        <Kpi label="Evacuees" value={`${evacuees}`} sub="in corridor" />
        <Kpi
          label="Brigade"
          value={arrived ? "On scene" : eta ? `${Math.max(0, Math.ceil(eta - simTime))}s` : "—"}
          sub={arrived ? "intervention" : "ETA"}
        />
      </div>

      {incidents[0] ? (
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-alarm">
            {incidents[0].type} · {incidents[0].phase}
          </p>
          <p className="font-mono text-xs text-muted">
            {incidents[0].tube} · {Math.round(incidents[0].z)} m
            {incidents[0].type === "fire" ? ` · smoke ${Math.round(incidents[0].smoke)} m` : ""}
          </p>
        </div>
      ) : null}

      {paOn && pa ? (
        <div className="border-b border-border bg-elevated px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-info">Omroep</p>
          <p className="text-xs leading-snug text-fg">{pa}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Alarm list</h2>
        <Button size="sm" variant="ghost" onClick={ackAll}>
          Ack all
        </Button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {alarms.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-subtle">No events</li>
        ) : (
          alarms.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => ack(a.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-elevated",
                  a.acked && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    a.level === "alarm" && "bg-alarm",
                    a.level === "warning" && "bg-warn",
                    a.level === "info" && "bg-info",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-accent">{a.system}</span>
                    <span className="font-mono text-xs text-subtle tabular">{fmt(a.t)}</span>
                  </span>
                  <span className="block text-xs leading-snug text-fg">{a.message}</span>
                  <span className="block font-mono text-xs text-subtle">{a.loc}</span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-subtle">{label}</p>
      <p className="font-mono text-sm font-medium text-fg tabular">{value}</p>
      <p className="font-mono text-xs text-muted">{sub}</p>
    </div>
  );
}
