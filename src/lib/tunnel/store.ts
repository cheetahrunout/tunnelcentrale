import { create } from "zustand";
import {
  ackAlarm,
  ackAll,
  clearScene,
  injectAccident,
  injectFire,
  injectHeight,
  injectStopped,
  resetWorld,
  takeSnapshot,
  tickWorld,
  world,
} from "./simulation";
import type { CamPreset, Snapshot, TubeId, ViewMode } from "./types";

interface UiState {
  view: ViewMode;
  camPreset: CamPreset;
  paused: boolean;
  timeScale: 1 | 2 | 4;
  autoIncidents: boolean;
  selected: string | null;
  snapshot: Snapshot;
  mobileTab: "systems" | "alarms" | "scene";
  setView: (v: ViewMode) => void;
  setCam: (c: CamPreset) => void;
  setPaused: (p: boolean) => void;
  setScale: (s: 1 | 2 | 4) => void;
  setDensity: (d: number) => void;
  setAutoResponse: (on: boolean) => void;
  setAutoIncidents: (on: boolean) => void;
  setSelected: (id: string | null) => void;
  setMobileTab: (t: UiState["mobileTab"]) => void;
  fire: (tube?: TubeId) => void;
  accident: (tube?: TubeId) => void;
  stopped: (tube?: TubeId) => void;
  height: () => void;
  clear: () => void;
  ack: (id: string) => void;
  ackAll: () => void;
  reset: () => void;
  toggleBarrier: (portal: "west" | "east") => void;
  setLighting: (tube: TubeId, v: number) => void;
  setVent: (tube: TubeId, v: number) => void;
  togglePa: () => void;
  togglePump: () => void;
  tick: (dt: number) => void;
}

function publish(): Snapshot {
  return takeSnapshot(world);
}

let autoAcc = 0;
let snapAcc = 0;

export const useTunnel = create<UiState>((set, get) => ({
  view: "2d",
  camPreset: "overview",
  paused: false,
  timeScale: 1,
  autoIncidents: false,
  selected: null,
  snapshot: publish(),
  mobileTab: "scene",
  setView: (v) => set({ view: v }),
  setCam: (c) => set({ camPreset: c }),
  setPaused: (p) => set({ paused: p }),
  setScale: (s) => set({ timeScale: s }),
  setDensity: (d) => {
    world.density = d;
    set({ snapshot: publish() });
  },
  setAutoResponse: (on) => {
    world.autoResponse = on;
    set({ snapshot: publish() });
  },
  setAutoIncidents: (on) => {
    autoAcc = on ? 35 : 0;
    set({ autoIncidents: on });
  },
  setSelected: (id) => set({ selected: id }),
  setMobileTab: (t) => set({ mobileTab: t }),
  fire: (tube) => {
    injectFire(world, tube);
    set({
      snapshot: publish(),
      camPreset: get().view === "3d" ? "incident" : get().camPreset,
    });
  },
  accident: (tube) => {
    injectAccident(world, tube);
    set({ snapshot: publish() });
  },
  stopped: (tube) => {
    injectStopped(world, tube);
    set({ snapshot: publish() });
  },
  height: () => {
    injectHeight(world);
    set({ snapshot: publish() });
  },
  clear: () => {
    clearScene(world);
    set({ snapshot: publish() });
  },
  ack: (id) => {
    ackAlarm(world, id);
    set({ snapshot: publish() });
  },
  ackAll: () => {
    ackAll(world);
    set({ snapshot: publish() });
  },
  reset: () => {
    resetWorld();
    autoAcc = 0;
    set({ snapshot: publish(), selected: null });
  },
  toggleBarrier: (portal) => {
    const cur = world.targets.barrier[portal];
    world.targets.barrier[portal] = cur > 0.5 ? 0 : 1;
    world.systems.trafficLight[portal] = cur > 0.5 ? "green" : "red";
    world.closed[portal === "west" ? "eastbound" : "westbound"] = cur <= 0.5;
    set({ snapshot: publish() });
  },
  setLighting: (tube, v) => {
    world.targets.lighting[tube] = v;
    set({ snapshot: publish() });
  },
  setVent: (tube, v) => {
    world.targets.ventPower[tube] = v;
    set({ snapshot: publish() });
  },
  togglePa: () => {
    world.systems.pa = !world.systems.pa;
    if (world.systems.pa && !world.systems.paMessage) {
      world.systems.paMessage = "Attention. Follow instructions from the traffic control centre.";
    }
    set({ snapshot: publish() });
  },
  togglePump: () => {
    world.systems.firePump = !world.systems.firePump;
    set({ snapshot: publish() });
  },
  tick: (dt) => {
    if (!get().paused) {
      const scale = get().timeScale;
      tickWorld(dt * scale);
      if (get().autoIncidents && !world.incidents.some((i) => i.phase !== "clearing")) {
        autoAcc += dt * scale;
        if (autoAcc > 80) {
          autoAcc = 0;
          const r = Math.random();
          if (r < 0.4) injectStopped(world);
          else if (r < 0.75) injectAccident(world);
          else injectFire(world);
        }
      }
    }
    snapAcc += dt;
    if (snapAcc >= 0.12) {
      snapAcc = 0;
      set({ snapshot: publish() });
    }
  },
}));
