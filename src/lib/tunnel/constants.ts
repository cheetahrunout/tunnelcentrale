import type { TubeId } from "./types";

export const LENGTH = 800;
export const ZONE_COUNT = 8;
export const ZONE_M = LENGTH / ZONE_COUNT;
export const HEIGHT = 5.4;
export const TUBE_W = 11;
export const CHANNEL_W = 2.4;
export const WALL_W = 0.8;
export const LANE_W = 3.5;

export const WB_CENTER = -7.5;
export const EB_CENTER = 7.5;

export const STEP = 1 / 30;
export const MAX_VEHICLES = 72;
export const MAX_PER_TUBE = 36;

export const DOOR_M = [100, 200, 300, 400, 500, 600, 700];
export const FAN_M = [120, 280, 440, 600];
export const CAMERA_M: number[] = Array.from({ length: 17 }, (_, i) => i * 50);
export const POST_M: number[] = Array.from({ length: 16 }, (_, i) => 25 + i * 50);

export const PALETTE = {
  bg: "#0b0e12",
  surface: "#12171e",
  elevated: "#1a212b",
  fg: "#e8edf2",
  muted: "#8b97a5",
  subtle: "#5c6773",
  border: "#2a3440",
  accent: "#8aa4b8",
  ok: "#3dba7e",
  warn: "#c9a227",
  alarm: "#e24b4b",
  info: "#5ba3d9",
  asphalt: "#232830",
  asphaltEdge: "#2e3540",
  channel: "#1a2a24",
  lane: "#cfd6dd",
  headlight: "#f4f1c8",
  fire: "#ff6a2a",
  smoke: "rgba(160,168,176,0.28)",
} as const;

export const CAR_COLORS = [
  "#d9dee4",
  "#4a5160",
  "#7a1f1f",
  "#1c3d5a",
  "#2c4a3c",
  "#b7a58a",
  "#3a3f48",
  "#6b5a46",
];

export const LTS_SYSTEMS = [
  { id: "cctv", name: "CCTV", full: "Camera surveillance", group: "Detection" },
  { id: "aid", name: "AID", full: "Automatic incident detection", group: "Detection" },
  { id: "lbd", name: "LBD", full: "Linear fire detection", group: "Detection" },
  { id: "loops", name: "Loops", full: "Detection loops / speed underrun", group: "Detection" },
  { id: "height", name: "Height", full: "Portal height detection", group: "Detection" },
  { id: "lighting", name: "Lighting", full: "Tube lighting (boost on incident)", group: "TTI" },
  { id: "vent", name: "Jet fans", full: "Longitudinal smoke extraction", group: "TTI" },
  { id: "blus", name: "Fire main", full: "Pressurised extinguishing system", group: "TTI" },
  { id: "overdruk", name: "Overpressure", full: "Escape-channel smoke barrier", group: "TTI" },
  { id: "escape", name: "Escape lights", full: "Vluchtgang lighting & signs", group: "TTI" },
  { id: "pa", name: "PA / omroep", full: "Public address to road users", group: "Comms" },
  { id: "hulppost", name: "Hulpposten", full: "Emergency cabinets every 50 m", group: "Comms" },
  { id: "vri", name: "Signals", full: "Portal traffic lights", group: "Traffic" },
  { id: "barrier", name: "Barriers", full: "Slagbomen at both portals", group: "Traffic" },
  { id: "matrix", name: "Matrix", full: "Variable message signs", group: "Traffic" },
  { id: "pumps", name: "Pump cellars", full: "Liquid drainage pompkelders", group: "Plant" },
  { id: "ups", name: "UPS", full: "Noodstroom / backup power", group: "Plant" },
] as const;

export function laneWorldX(tube: TubeId, lane: 0 | 1): number {
  if (tube === "eastbound") return lane === 0 ? 4.7 : 8.3;
  return lane === 0 ? -4.7 : -8.3;
}

export function vehicleWorldZ(tube: TubeId, pos: number): number {
  return tube === "eastbound" ? pos * LENGTH : (1 - pos) * LENGTH;
}

export function posFromZ(tube: TubeId, z: number): number {
  return tube === "eastbound" ? z / LENGTH : 1 - z / LENGTH;
}

export function nearestDoorZ(z: number): number {
  let best = DOOR_M[0];
  let d = Math.abs(z - best);
  for (const m of DOOR_M) {
    const n = Math.abs(z - m);
    if (n < d) {
      d = n;
      best = m;
    }
  }
  return best;
}

export function otherTube(t: TubeId): TubeId {
  return t === "eastbound" ? "westbound" : "eastbound";
}

export function entryPortal(t: TubeId): "west" | "east" {
  return t === "eastbound" ? "west" : "east";
}

export function kmh(ms: number): number {
  return ms * 3.6;
}
