import {
  Box,
  LayoutPanelTop,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTunnel } from "@/lib/tunnel/store";
import type { AppStatus } from "@/lib/tunnel/types";

function statusLabel(s: AppStatus): string {
  switch (s) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "incident":
      return "Incident";
    case "closed":
      return "Tubes closed";
  }
}

function statusClass(s: AppStatus): string {
  switch (s) {
    case "operational":
      return "text-ok";
    case "degraded":
      return "text-warn";
    case "incident":
      return "text-warn";
    case "closed":
      return "text-alarm";
  }
}

function fmtSim(t: number): string {
  const s = Math.floor(t);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function Header({ clock }: { clock: string }) {
  const view = useTunnel((s) => s.view);
  const setView = useTunnel((s) => s.setView);
  const paused = useTunnel((s) => s.paused);
  const setPaused = useTunnel((s) => s.setPaused);
  const timeScale = useTunnel((s) => s.timeScale);
  const setScale = useTunnel((s) => s.setScale);
  const reset = useTunnel((s) => s.reset);
  const status = useTunnel((s) => s.snapshot.status);
  const simTime = useTunnel((s) => s.snapshot.simTime);
  const unacked = useTunnel((s) => s.snapshot.unacked);

  return (
    <header className="flex shrink-0 flex-col border-b border-border bg-surface">
      <div
        className={cn(
          "h-0.5 w-full",
          status === "operational" && "bg-ok",
          status === "degraded" && "bg-warn",
          status === "incident" && "bg-warn",
          status === "closed" && "bg-alarm",
        )}
      />
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4">
        <CrossSectionMark />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="truncate text-sm font-semibold tracking-wide text-fg sm:text-base">
              Waterlinietunnel
            </h1>
            <span className="hidden font-mono text-xs text-subtle sm:inline">A12 · km 32.1</span>
          </div>
          <p className="truncate font-mono text-xs text-muted">
            Verkeerscentrale · LTS 1.2
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unacked > 0 ? (
            <span className="hidden rounded-sm bg-alarm/15 px-2 py-1 font-mono text-xs text-alarm sm:inline">
              {unacked} ALM
            </span>
          ) : null}
          <div className="text-right">
            <p className={cn("font-mono text-xs font-semibold uppercase tracking-wider", statusClass(status))}>
              {statusLabel(status)}
            </p>
            <p className="font-mono text-xs text-muted tabular">
              {clock} · T+{fmtSim(simTime)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-3 py-1.5 sm:px-4">
        <div className="flex rounded-sm border border-border p-0.5">
          <Button
            size="sm"
            variant={view === "2d" ? "primary" : "ghost"}
            className="gap-1.5"
            onClick={() => setView("2d")}
            aria-pressed={view === "2d"}
          >
            <LayoutPanelTop className="size-3.5" />
            <span className="hidden sm:inline">Schematic</span>
            <span className="sm:hidden">2D</span>
          </Button>
          <Button
            size="sm"
            variant={view === "3d" ? "primary" : "ghost"}
            className="gap-1.5"
            onClick={() => setView("3d")}
            aria-pressed={view === "3d"}
          >
            <Box className="size-3.5" />
            3D
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-9" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume" : "Pause"}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </Button>
          {([1, 2, 4] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={timeScale === s ? "muted" : "ghost"}
              className="min-w-9 font-mono"
              onClick={() => setScale(s)}
            >
              {s}×
            </Button>
          ))}
          <Button size="icon" variant="ghost" className="size-9" onClick={reset} aria-label="Reset simulator">
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function CrossSectionMark() {
  return (
    <svg viewBox="0 0 44 36" className="size-9 shrink-0 text-accent" aria-hidden="true">
      <rect x="1" y="1" width="42" height="34" rx="4" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <rect x="5" y="5" width="34" height="10" rx="1.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.2" />
      <rect x="18" y="16.5" width="8" height="4" rx="0.8" fill="#3dba7e" fillOpacity="0.85" />
      <rect x="5" y="21.5" width="34" height="10" rx="1.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
