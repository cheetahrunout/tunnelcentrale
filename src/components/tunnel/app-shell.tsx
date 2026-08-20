import { lazy, Suspense, useEffect, useState } from "react";
import { useTunnel } from "@/lib/tunnel/store";
import { world } from "@/lib/tunnel/simulation";
import { kmh } from "@/lib/tunnel/constants";
import { Header } from "./header";
import { Schematic } from "./schematic";
import { SystemPanel } from "./system-panel";
import { AlarmPanel } from "./alarm-panel";
import { ScenarioBar } from "./scenario-bar";
import { cn } from "@/lib/utils";

const View3D = lazy(() => import("./view-3d").then((m) => ({ default: m.View3D })));

export function TunnelApp() {
  const view = useTunnel((s) => s.view);
  const tick = useTunnel((s) => s.tick);
  const mobileTab = useTunnel((s) => s.mobileTab);
  const setMobileTab = useTunnel((s) => s.setMobileTab);
  const [clock, setClock] = useState("--:--:--");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  useEffect(() => {
    const stamp = () => setClock(new Date().toLocaleTimeString("nl-NL", { hour12: false }));
    stamp();
    const id = window.setInterval(stamp, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <Header clock={clock} />
      <div className={cn("flex min-h-0 flex-1", mobileTab !== "scene" && "max-lg:hidden")}>
        <aside className="hidden w-72 shrink-0 border-r border-border lg:block">
          <SystemPanel />
        </aside>
        <main className={cn("flex min-h-0 min-w-0 flex-1 flex-col", mobileTab !== "scene" && "max-lg:hidden")}>
          <div className="relative min-h-0 flex-1">
            {view === "2d" ? (
              <Schematic />
            ) : mounted ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-muted">
                    Loading spatial view
                  </div>
                }
              >
                <View3D />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading spatial view
              </div>
            )}
            <SelectedPeek />
          </div>
          <div className="hidden md:block">
            <ScenarioBar />
          </div>
        </main>
        <aside className="hidden w-72 shrink-0 border-l border-border lg:block xl:w-80">
          <AlarmPanel />
        </aside>
      </div>

      {mobileTab === "systems" ? (
        <div className="min-h-0 flex-1 border-t border-border lg:hidden">
          <SystemPanel />
        </div>
      ) : null}
      {mobileTab === "alarms" ? (
        <div className="min-h-0 flex-1 border-t border-border lg:hidden">
          <AlarmPanel />
        </div>
      ) : null}

      <div className="md:hidden">
        <ScenarioBar />
      </div>

      <nav className="flex border-t border-border bg-surface lg:hidden">
        {(
          [
            ["scene", "Schematic"],
            ["systems", "TTI"],
            ["alarms", "Alarms"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobileTab(id)}
            className={cn(
              "h-11 flex-1 text-xs font-medium",
              mobileTab === id ? "bg-elevated text-fg" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className="shrink-0 border-t border-border bg-surface px-3 py-1 text-center font-mono text-[10px] leading-tight text-subtle sm:text-left">
        Training simulator · not for commercial or operational use
      </p>
    </div>
  );
}

function SelectedPeek() {
  const id = useTunnel((s) => s.selected);
  useTunnel((s) => s.snapshot.simTime);
  if (!id) return null;

  if (id.startsWith("CCTV")) {
    return (
      <aside className="absolute right-3 top-3 max-w-56 rounded-md border border-border bg-surface/95 px-3 py-2">
        <p className="font-mono text-xs text-info">{id}</p>
        <p className="text-xs text-muted">Live camera · auto-switch on AID</p>
      </aside>
    );
  }
  if (id.startsWith("DOOR")) {
    return (
      <aside className="absolute right-3 top-3 max-w-56 rounded-md border border-border bg-surface/95 px-3 py-2">
        <p className="font-mono text-xs text-ok">{id.replace("DOOR-", "Escape ")} m</p>
        <p className="text-xs text-muted">Vluchtdeur · overpressure on fire protocol</p>
      </aside>
    );
  }
  const v = world.vehicles.find((x) => x.id === id);
  if (!v) return null;
  return (
    <aside className="absolute right-3 top-3 max-w-56 rounded-md border border-border bg-surface/95 px-3 py-2">
      <p className="font-mono text-xs text-accent">{v.id}</p>
      <p className="text-xs text-fg">
        {v.type} · {v.tube} lane {v.lane + 1}
      </p>
      <p className="font-mono text-xs text-muted tabular">
        {Math.round(kmh(v.speed))} km/h · {v.status} · {Math.round(v.pos * 800)} m
      </p>
    </aside>
  );
}
