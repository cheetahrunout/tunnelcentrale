import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LTS_SYSTEMS } from "@/lib/tunnel/constants";
import { world } from "@/lib/tunnel/simulation";
import { useTunnel } from "@/lib/tunnel/store";

function led(ok: boolean, warn = false) {
  return cn(
    "size-1.5 shrink-0 rounded-full",
    ok && !warn && "bg-ok",
    warn && "bg-warn",
    !ok && "bg-alarm",
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function SystemPanel() {
  const snap = useTunnel((s) => s.snapshot);
  const s = snap.systems;
  const auto = world.autoResponse;
  const setAuto = useTunnel((st) => st.setAutoResponse);
  const toggleBarrier = useTunnel((st) => st.toggleBarrier);
  const setLighting = useTunnel((st) => st.setLighting);
  const setVent = useTunnel((st) => st.setVent);
  const togglePa = useTunnel((st) => st.togglePa);
  const togglePump = useTunnel((st) => st.togglePump);
  const density = world.density;
  const setDensity = useTunnel((st) => st.setDensity);

  const rows: { id: string; value: string; ok: boolean; warn?: boolean }[] = [
    { id: "cctv", value: s.cctvOnline ? `${17 * 2} feeds` : "Offline", ok: s.cctvOnline },
    { id: "aid", value: s.aidOnline ? "Armed" : "Off", ok: s.aidOnline },
    { id: "lbd", value: s.lbdOnline ? "Armed" : "Off", ok: s.lbdOnline },
    { id: "loops", value: "Active", ok: true },
    { id: "height", value: s.heightOnline ? "Armed" : "Off", ok: s.heightOnline },
    {
      id: "lighting",
      value: `WB ${pct(s.lighting.westbound)}  EB ${pct(s.lighting.eastbound)}`,
      ok: true,
      warn: s.lighting.eastbound > 0.9 || s.lighting.westbound > 0.9,
    },
    {
      id: "vent",
      value: `WB ${pct(s.ventPower.westbound)}  EB ${pct(s.ventPower.eastbound)}`,
      ok: true,
      warn: s.ventPower.eastbound > 0.8 || s.ventPower.westbound > 0.8,
    },
    { id: "blus", value: s.firePump ? "Pressurised" : "Standby", ok: true, warn: s.firePump },
    { id: "overdruk", value: pct(s.overpressure), ok: s.overpressure > 0.1, warn: s.overpressure > 0.8 },
    { id: "escape", value: pct(s.escapeLighting), ok: true },
    { id: "pa", value: s.pa ? "LIVE" : "Idle", ok: true, warn: s.pa },
    { id: "hulppost", value: "32 cabinets", ok: true },
    {
      id: "vri",
      value: `${s.trafficLight.west} / ${s.trafficLight.east}`,
      ok: s.trafficLight.west === "green" && s.trafficLight.east === "green",
      warn: s.trafficLight.west !== "green" || s.trafficLight.east !== "green",
    },
    {
      id: "barrier",
      value: `${s.barrier.west > 0.5 ? "DOWN" : "up"} / ${s.barrier.east > 0.5 ? "DOWN" : "up"}`,
      ok: s.barrier.west < 0.5 && s.barrier.east < 0.5,
      warn: s.barrier.west > 0.5 || s.barrier.east > 0.5,
    },
    { id: "matrix", value: `${s.matrix.west} · ${s.matrix.east}`, ok: true },
    {
      id: "pumps",
      value: `W ${pct(s.pumpLevel.west)}${s.pumpOn.west ? " ON" : ""}  E ${pct(s.pumpLevel.east)}`,
      ok: true,
      warn: s.pumpOn.west || s.pumpOn.east,
    },
    { id: "ups", value: pct(s.upsLoad), ok: s.mains, warn: s.upsLoad > 0.7 },
  ];

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">TTI · LTS</h2>
        <button
          type="button"
          onClick={() => setAuto(!auto)}
          className={cn(
            "rounded-sm px-2 py-1 font-mono text-xs",
            auto ? "bg-ok/15 text-ok" : "bg-elevated text-muted",
          )}
        >
          {auto ? "AUTO" : "MANUAL"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {LTS_SYSTEMS.map((sys) => {
          const row = rows.find((r) => r.id === sys.id);
          if (!row) return null;
          return (
            <div
              key={sys.id}
              className="flex items-center gap-2 border-b border-border/60 py-1.5 last:border-0"
            >
              <span className={led(row.ok, row.warn)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-fg">{sys.name}</p>
                <p className="truncate font-mono text-xs text-subtle">{sys.full}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted tabular">{row.value}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Manual plant</p>
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" onClick={() => toggleBarrier("west")}>
            West barrier
          </Button>
          <Button size="sm" onClick={() => toggleBarrier("east")}>
            East barrier
          </Button>
          <Button size="sm" onClick={togglePa}>
            PA {s.pa ? "off" : "on"}
          </Button>
          <Button size="sm" onClick={togglePump}>
            Fire main
          </Button>
        </div>
        <label className="block text-xs text-muted">
          WB lighting
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={world.targets.lighting.westbound}
            onChange={(e) => setLighting("westbound", Number(e.target.value))}
            className="mt-1 h-2 w-full accent-accent"
          />
        </label>
        <label className="block text-xs text-muted">
          EB jet fans
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={world.targets.ventPower.eastbound}
            onChange={(e) => setVent("eastbound", Number(e.target.value))}
            className="mt-1 h-2 w-full accent-accent"
          />
        </label>
        <label className="block text-xs text-muted">
          Traffic density
          <input
            type="range"
            min={0.15}
            max={1}
            step={0.05}
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
            className="mt-1 h-2 w-full accent-accent"
          />
        </label>
      </div>
    </section>
  );
}
