import { Flame, CarFront, Octagon, Ruler, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTunnel } from "@/lib/tunnel/store";

export function ScenarioBar() {
  const fire = useTunnel((s) => s.fire);
  const accident = useTunnel((s) => s.accident);
  const stopped = useTunnel((s) => s.stopped);
  const height = useTunnel((s) => s.height);
  const clear = useTunnel((s) => s.clear);
  const autoInc = useTunnel((s) => s.autoIncidents);
  const setAutoInc = useTunnel((s) => s.setAutoIncidents);
  const hasInc = useTunnel((s) => s.snapshot.incidents.length > 0);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border bg-surface px-3 py-2 sm:px-4">
      <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wider text-muted sm:inline">
        Scenarios
      </span>
      <Button size="sm" variant="warn" onClick={() => accident()}>
        <CarFront className="size-3.5" />
        Accident
      </Button>
      <Button size="sm" variant="alarm" onClick={() => fire()}>
        <Flame className="size-3.5" />
        Fire
      </Button>
      <Button size="sm" onClick={() => stopped()}>
        <Octagon className="size-3.5" />
        Stopped
      </Button>
      <Button size="sm" onClick={height}>
        <Ruler className="size-3.5" />
        Height
      </Button>
      <Button size="sm" variant={hasInc ? "primary" : "outline"} onClick={clear}>
        <ShieldCheck className="size-3.5" />
        All clear
      </Button>
      <button
        type="button"
        onClick={() => setAutoInc(!autoInc)}
        className={cn(
          "ml-auto h-8 rounded-sm px-2.5 font-mono text-xs",
          autoInc ? "bg-ok/15 text-ok" : "bg-elevated text-muted",
        )}
      >
        Auto incidents {autoInc ? "on" : "off"}
      </button>
    </div>
  );
}
