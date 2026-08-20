import {
  CAMERA_M,
  CAR_COLORS,
  DOOR_M,
  LENGTH,
  MAX_PER_TUBE,
  MAX_VEHICLES,
  STEP,
  ZONE_COUNT,
  ZONE_M,
  entryPortal,
  kmh,
  laneWorldX,
  nearestDoorZ,
  otherTube,
  vehicleWorldZ,
} from "./constants";
import type {
  Alarm,
  AppStatus,
  Incident,
  IncidentType,
  Snapshot,
  Systems,
  Targets,
  TubeId,
  Vehicle,
  VehicleType,
  World,
} from "./types";

function nid(w: World, p: string): string {
  w.seq += 1;
  return `${p}-${w.seq}`;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function tubeLabel(t: TubeId): string {
  return t === "eastbound" ? "Eastbound tube" : "Westbound tube";
}

function locOf(t: TubeId, pos: number): string {
  const chain = Math.round(pos * LENGTH);
  return `${t === "eastbound" ? "EB" : "WB"} ${chain} m`;
}

function defaultSystems(): Systems {
  return {
    lighting: { westbound: 0.55, eastbound: 0.55 },
    ventPower: { westbound: 0.18, eastbound: 0.18 },
    ventDir: { westbound: -1, eastbound: 1 },
    barrier: { west: 0, east: 0 },
    trafficLight: { west: "green", east: "green" },
    firePump: false,
    overpressure: 0.15,
    escapeLighting: 0.35,
    pa: false,
    paMessage: "",
    pumpLevel: { west: 0.22, east: 0.19 },
    pumpOn: { west: false, east: false },
    upsLoad: 0.21,
    mains: true,
    matrix: { west: "80", east: "80" },
    aidOnline: true,
    lbdOnline: true,
    cctvOnline: true,
    heightOnline: true,
  };
}

function defaultTargets(): Targets {
  return {
    lighting: { westbound: 0.55, eastbound: 0.55 },
    ventPower: { westbound: 0.18, eastbound: 0.18 },
    barrier: { west: 0, east: 0 },
    escapeLighting: 0.35,
    overpressure: 0.15,
  };
}

function pushAlarm(
  w: World,
  level: Alarm["level"],
  system: string,
  message: string,
  loc: string,
): void {
  w.alarms.unshift({
    id: nid(w, "al"),
    t: w.simTime,
    level,
    system,
    message,
    loc,
    acked: false,
  });
  if (w.alarms.length > 80) w.alarms.length = 80;
}

function vehicleSpec(type: VehicleType): { length: number; speed: number } {
  switch (type) {
    case "truck":
      return { length: 12.4, speed: 18 };
    case "bus":
      return { length: 12.2, speed: 19 };
    case "van":
      return { length: 5.4, speed: 20.5 };
    default:
      return { length: 4.3, speed: 22.2 };
  }
}

function randomType(rng: Rng = Math.random): VehicleType {
  const r = rng();
  if (r < 0.72) return "car";
  if (r < 0.86) return "van";
  if (r < 0.97) return "truck";
  return "bus";
}

function spawnVehicle(w: World, tube: TubeId, opts?: Partial<Vehicle>, rng: Rng = Math.random): Vehicle | null {
  const inTube = w.vehicles.filter((v) => v.tube === tube);
  if (inTube.length >= MAX_PER_TUBE || w.vehicles.length >= MAX_VEHICLES) return null;
  const lane: 0 | 1 = opts?.lane ?? (rng() < 0.32 ? 0 : 1);
  const near = inTube.filter((v) => v.lane === lane && v.pos < 0.08);
  if (near.some((v) => v.pos < (v.length + 8) / LENGTH) && !opts?.pos) return null;
  const type = opts?.type ?? randomType(rng);
  const spec = vehicleSpec(type);
  const factor = 0.9 + rng() * 0.12;
  const v: Vehicle = {
    id: nid(w, "vh"),
    tube,
    lane,
    pos: opts?.pos ?? 0.001,
    speed: opts?.speed ?? spec.speed * factor,
    targetSpeed: opts?.targetSpeed ?? spec.speed * factor,
    type,
    color: opts?.color ?? pick(CAR_COLORS, rng),
    length: spec.length,
    status: opts?.status ?? "driving",
    stoppedFor: 0,
    evacSpawned: false,
  };
  w.vehicles.push(v);
  return v;
}

function seedTraffic(w: World): void {
  const rng = mulberry32(20260820);
  for (const tube of ["eastbound", "westbound"] as TubeId[]) {
    let pos = 0.06;
    while (pos < 0.94) {
      if (rng() < 0.55) spawnVehicle(w, tube, { pos, lane: rng() < 0.3 ? 0 : 1 }, rng);
      pos += 0.05 + rng() * 0.07;
    }
  }
}

export function createWorld(): World {
  const w: World = {
    simTime: 0,
    frame: 0,
    vehicles: [],
    evacuees: [],
    incidents: [],
    alarms: [],
    systems: defaultSystems(),
    targets: defaultTargets(),
    closed: { westbound: false, eastbound: false },
    spawnAcc: { westbound: 0.4, eastbound: 1.1 },
    pendingProtocol: null,
    emergencyEta: null,
    emergencyArrived: false,
    density: 0.55,
    autoResponse: true,
    seq: 1,
  };
  seedTraffic(w);
  pushAlarm(w, "info", "SCADA", "Waterlinietunnel handed over to Verkeerscentrale", "A12");
  return w;
}

export const world: World = createWorld();

function activeIncident(w: World): Incident | undefined {
  return w.incidents.find((i) => i.phase !== "clearing");
}

function applyProtocol(w: World, kind: IncidentType, tube: TubeId): void {
  const sys = w.systems;
  const tg = w.targets;
  if (kind === "fire") {
    w.closed.eastbound = true;
    w.closed.westbound = true;
    tg.lighting.eastbound = 1;
    tg.lighting.westbound = 1;
    tg.ventPower[tube] = 1;
    tg.ventPower[otherTube(tube)] = 0.55;
    sys.ventDir[tube] = tube === "eastbound" ? 1 : -1;
    tg.barrier.west = 1;
    tg.barrier.east = 1;
    sys.trafficLight.west = "red";
    sys.trafficLight.east = "red";
    sys.firePump = true;
    tg.overpressure = 1;
    tg.escapeLighting = 1;
    sys.pa = true;
    sys.paMessage = "Leave your vehicle. Walk to the nearest escape door. Follow the green signs.";
    sys.matrix.west = "CLOSED";
    sys.matrix.east = "CLOSED";
    if (w.emergencyEta === null) w.emergencyEta = w.simTime + 55;
    pushAlarm(w, "alarm", "LTS", "Fire protocol armed — both tubes closed, extraction max", locOf(tube, 0.5));
  } else if (kind === "accident" || kind === "stopped") {
    w.closed[tube] = true;
    const portal = entryPortal(tube);
    tg.barrier[portal] = 1;
    sys.trafficLight[portal] = "red";
    tg.lighting[tube] = 1;
    tg.lighting[otherTube(tube)] = 0.7;
    tg.ventPower[tube] = 0.4;
    sys.matrix[portal] = "QUEUE";
    sys.pa = true;
    sys.paMessage =
      kind === "accident"
        ? "Incident ahead. Remain in your vehicle unless instructed."
        : "Stopped vehicle. Keep a safe distance.";
    if (w.emergencyEta === null) w.emergencyEta = w.simTime + 70;
    pushAlarm(
      w,
      kind === "accident" ? "alarm" : "warning",
      "AID",
      kind === "accident" ? "Accident protocol — tube closed at entry" : "Stopped-vehicle protocol",
      tubeLabel(tube),
    );
  } else if (kind === "height") {
    const portal = entryPortal(tube);
    w.closed[tube] = true;
    tg.barrier[portal] = 1;
    sys.trafficLight[portal] = "red";
    sys.matrix[portal] = "HEIGHT";
    pushAlarm(w, "alarm", "Height", "Overheight vehicle — barrier dropped", portal === "west" ? "West portal" : "East portal");
  }
}

function resetTargetsIdle(w: World): void {
  if (activeIncident(w)) return;
  w.closed.eastbound = false;
  w.closed.westbound = false;
  w.targets = defaultTargets();
  w.systems.trafficLight = { west: "green", east: "green" };
  w.systems.firePump = false;
  w.systems.pa = false;
  w.systems.paMessage = "";
  w.systems.matrix = { west: "80", east: "80" };
  w.emergencyEta = null;
  w.emergencyArrived = false;
}

function stepSystems(w: World, dt: number): void {
  const s = w.systems;
  const t = w.targets;
  const k = 1 - Math.exp(-dt * 1.8);
  s.lighting.eastbound = lerp(s.lighting.eastbound, t.lighting.eastbound, k);
  s.lighting.westbound = lerp(s.lighting.westbound, t.lighting.westbound, k);
  s.ventPower.eastbound = lerp(s.ventPower.eastbound, t.ventPower.eastbound, k);
  s.ventPower.westbound = lerp(s.ventPower.westbound, t.ventPower.westbound, k);
  s.barrier.west = lerp(s.barrier.west, t.barrier.west, k);
  s.barrier.east = lerp(s.barrier.east, t.barrier.east, k);
  s.escapeLighting = lerp(s.escapeLighting, t.escapeLighting, k);
  s.overpressure = lerp(s.overpressure, t.overpressure, k);

  for (const p of ["west", "east"] as const) {
    s.pumpLevel[p] += (0.008 + Math.random() * 0.004) * dt;
    if (s.pumpLevel[p] > 0.62) s.pumpOn[p] = true;
    if (s.pumpOn[p]) {
      s.pumpLevel[p] -= 0.05 * dt;
      if (s.pumpLevel[p] < 0.18) s.pumpOn[p] = false;
    }
    s.pumpLevel[p] = clamp(s.pumpLevel[p], 0.05, 0.95);
  }

  const load =
    0.18 +
    s.lighting.eastbound * 0.08 +
    s.lighting.westbound * 0.08 +
    s.ventPower.eastbound * 0.16 +
    s.ventPower.westbound * 0.16 +
    (s.firePump ? 0.12 : 0) +
    s.overpressure * 0.06;
  s.upsLoad = lerp(s.upsLoad, load, 0.2);
}

function stepVehicles(w: World, dt: number): void {
  const fire = w.incidents.find((i) => i.type === "fire" && i.phase !== "clearing");
  const inc = activeIncident(w);
  const doomed: string[] = [];

  for (const tube of ["eastbound", "westbound"] as TubeId[]) {
    for (const lane of [0, 1] as const) {
      const list = w.vehicles
        .filter((v) => v.tube === tube && v.lane === lane)
        .sort((a, b) => b.pos - a.pos);
      for (let i = 0; i < list.length; i++) {
        const v = list[i]!;
        const leader = i > 0 ? list[i - 1] : undefined;
        if (v.status === "burning" || v.status === "crashed") {
          v.speed = 0;
          v.stoppedFor += dt;
          continue;
        }

        let target = v.targetSpeed;
        if (inc && inc.tube === tube) {
          const dM = (inc.pos - v.pos) * LENGTH;
          if (dM > 0 && dM < 140) {
            target = dM < 16 ? 0 : Math.min(target, (dM - 16) / 3.5);
          }
          if (fire && fire.tube === tube) {
            const smokeEnd = fire.pos + fire.smoke / LENGTH;
            if (v.pos >= fire.pos && v.pos <= smokeEnd) {
              target = Math.min(target, 6);
            }
          }
        }

        if (leader) {
          const gap = (leader.pos - v.pos) * LENGTH - leader.length;
          const safe = 4 + v.speed * 1.35;
          if (gap < safe) target = Math.min(target, Math.max(0, leader.speed - 1.5));
          if (gap < 2.4) {
            v.pos = leader.pos - (leader.length + 2.6) / LENGTH;
            target = 0;
          }
        }

        const accel = target > v.speed + 0.3 ? 2.2 : target < v.speed - 0.3 ? -5.2 : 0;
        v.speed = clamp(v.speed + accel * dt, 0, 34);
        v.pos += (v.speed * dt) / LENGTH;

        if (v.speed < 0.5 && target < 0.5) {
          v.status = "stopped";
          v.stoppedFor += dt;
        } else if (accel < -1) {
          v.status = "braking";
          v.stoppedFor = 0;
        } else {
          v.status = "driving";
          v.stoppedFor = 0;
        }

        if (v.pos >= 1.02) doomed.push(v.id);
      }
    }
  }

  if (doomed.length) {
    w.vehicles = w.vehicles.filter((v) => !doomed.includes(v.id));
  }

  for (const tube of ["eastbound", "westbound"] as TubeId[]) {
    if (w.closed[tube]) continue;
    const portal = entryPortal(tube);
    if (w.systems.barrier[portal] > 0.55) continue;
    w.spawnAcc[tube] += dt;
    const interval = 1.1 + (1 - w.density) * 4.2;
    if (w.spawnAcc[tube] >= interval) {
      w.spawnAcc[tube] = 0;
      spawnVehicle(w, tube);
    }
  }
}

function spawnEvacuees(w: World, v: Vehicle): void {
  const z = vehicleWorldZ(v.tube, v.pos);
  const doorZ = nearestDoorZ(z);
  const count = v.type === "bus" ? 6 : v.type === "truck" ? 1 : v.type === "van" ? 2 : 1 + (Math.random() < 0.35 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    w.evacuees.push({
      id: nid(w, "ev"),
      z: z + (Math.random() - 0.5) * 3,
      x: laneWorldX(v.tube, v.lane),
      stage: "to_door",
      doorZ,
      exitZ: doorZ < LENGTH / 2 ? 0 : LENGTH,
      speed: 1.4 + Math.random() * 0.6,
    });
  }
  v.evacSpawned = true;
}

function stepEvacuees(w: World, dt: number): void {
  const remain: typeof w.evacuees = [];
  for (const e of w.evacuees) {
    if (e.stage === "to_door") {
      const dz = e.doorZ - e.z;
      const step = e.speed * dt;
      if (Math.abs(dz) < step) {
        e.z = e.doorZ;
        e.stage = "corridor";
      } else {
        e.z += Math.sign(dz) * step;
      }
    } else if (e.stage === "corridor") {
      const tx = 0;
      const dx = tx - e.x;
      const step = e.speed * dt;
      if (Math.abs(dx) > 0.15) {
        e.x += Math.sign(dx) * Math.min(step, Math.abs(dx));
      } else {
        e.x = 0;
        e.stage = "exiting";
      }
    } else {
      const dz = e.exitZ - e.z;
      const step = e.speed * 1.15 * dt;
      if (Math.abs(dz) < step) continue;
      e.z += Math.sign(dz) * step;
    }
    remain.push(e);
  }
  w.evacuees = remain;
}

function stepIncidents(w: World, dt: number): void {
  for (const inc of w.incidents) {
    if (inc.phase === "clearing") continue;

    if (inc.type === "fire") {
      const vent = w.systems.ventPower[inc.tube];
      inc.smoke = Math.min(LENGTH * 0.85, inc.smoke + (7 + vent * 24) * dt);
      if (inc.phase === "detected" || inc.phase === "responding") {
        inc.heat = Math.min(1, inc.heat + 0.05 * dt);
      } else if (inc.phase === "contained") {
        inc.heat = Math.max(0, inc.heat - 0.08 * dt);
      }
    }

    const involved = w.vehicles.filter((v) => inc.vehicleIds.includes(v.id));
    for (const v of involved) {
      if (inc.type === "fire") v.status = "burning";
      else if (inc.type === "accident") v.status = "crashed";
      else v.status = "stopped";
      v.speed = 0;
      if (inc.type === "fire" && !v.evacSpawned && v.stoppedFor > 3.5) spawnEvacuees(w, v);
      if (inc.type === "accident" && !v.evacSpawned && v.stoppedFor > 8) spawnEvacuees(w, v);
    }

    if (inc.phase === "detected" && w.simTime - inc.startedAt > 2.5) inc.phase = "responding";
    if (inc.phase === "responding" && w.evacuees.length > 0) inc.phase = "evacuating";

    if (w.emergencyEta !== null && !w.emergencyArrived && w.simTime >= w.emergencyEta) {
      w.emergencyArrived = true;
      pushAlarm(w, "info", "Dispatch", "Emergency services on scene", locOf(inc.tube, inc.pos));
    }
    if (w.emergencyArrived && inc.type === "fire" && w.simTime - (w.emergencyEta ?? 0) > 50) {
      if (inc.phase !== "contained") {
        inc.phase = "contained";
        pushAlarm(w, "info", "Fire", "Fire contained — cooling in progress", locOf(inc.tube, inc.pos));
      }
    }
  }

  if (w.pendingProtocol && w.simTime >= w.pendingProtocol.at) {
    if (w.autoResponse) applyProtocol(w, w.pendingProtocol.kind, w.pendingProtocol.tube);
    w.pendingProtocol = null;
  }
}

function detectAid(w: World): void {
  if (!w.systems.aidOnline) return;
  for (const v of w.vehicles) {
    if (v.status !== "stopped" && v.status !== "crashed" && v.status !== "burning") continue;
    if (v.stoppedFor < 2.2) continue;
    if (w.incidents.some((i) => i.vehicleIds.includes(v.id) && i.phase !== "clearing")) continue;
    if (w.incidents.some((i) => i.tube === v.tube && Math.abs(i.pos - v.pos) < 0.06 && i.phase !== "clearing"))
      continue;
    const kind: IncidentType = v.status === "burning" ? "fire" : v.status === "crashed" ? "accident" : "stopped";
    beginIncident(w, kind, v.tube, v.pos, [v.id], false);
  }
}

export function beginIncident(
  w: World,
  kind: IncidentType,
  tube: TubeId,
  pos: number,
  vehicleIds: string[],
  fromOperator: boolean,
): Incident {
  const z = vehicleWorldZ(tube, pos);
  const inc: Incident = {
    id: nid(w, "inc"),
    type: kind,
    tube,
    pos,
    z,
    startedAt: w.simTime,
    phase: "detected",
    vehicleIds,
    smoke: kind === "fire" ? 8 : 0,
    heat: kind === "fire" ? 0.2 : 0,
    acknowledged: false,
  };
  w.incidents = w.incidents.filter((i) => i.phase === "clearing" || i.tube !== tube);
  w.incidents.push(inc);

  const camIdx = Math.round((z / LENGTH) * (CAMERA_M.length - 1));
  const camId = `CCTV-${tube === "eastbound" ? "E" : "W"}-${String(camIdx + 1).padStart(2, "0")}`;

  if (kind === "fire") {
    pushAlarm(w, "alarm", "LBD", `Linear fire detection — heat at ${camId}`, locOf(tube, pos));
    pushAlarm(w, "alarm", "AID", "Stopped / burning vehicle confirmed", locOf(tube, pos));
    pushAlarm(w, "warning", "CCTV", `Auto-switch ${camId}`, locOf(tube, pos));
  } else if (kind === "accident") {
    pushAlarm(w, "alarm", "AID", "Collision — speed underrun + stopped vehicles", locOf(tube, pos));
    pushAlarm(w, "warning", "CCTV", `Auto-switch ${camId}`, locOf(tube, pos));
  } else if (kind === "stopped") {
    pushAlarm(w, "warning", "AID", "Stopped vehicle — speed underrun", locOf(tube, pos));
  } else {
    pushAlarm(w, "alarm", "Height", "Portal height loop triggered", tube === "eastbound" ? "West portal" : "East portal");
  }

  if (fromOperator || w.autoResponse) {
    w.pendingProtocol = { kind, at: w.simTime + (kind === "fire" ? 1.1 : 1.6), tube };
  }
  return inc;
}

export function injectFire(w: World, tube?: TubeId): void {
  const t: TubeId = tube ?? (Math.random() < 0.5 ? "eastbound" : "westbound");
  let v =
    w.vehicles.find((x) => x.tube === t && x.pos > 0.28 && x.pos < 0.72) ??
    w.vehicles.find((x) => x.tube === t);
  if (!v) v = spawnVehicle(w, t, { pos: 0.42, status: "stopped", speed: 0 }) ?? undefined;
  if (!v) return;
  v.status = "burning";
  v.speed = 0;
  v.pos = clamp(v.pos, 0.3, 0.7);
  beginIncident(w, "fire", t, v.pos, [v.id], true);
}

export function injectAccident(w: World, tube?: TubeId): void {
  const t: TubeId = tube ?? (Math.random() < 0.5 ? "eastbound" : "westbound");
  const pool = w.vehicles.filter((x) => x.tube === t && x.pos > 0.25 && x.pos < 0.75);
  let a: Vehicle | undefined = pool[0];
  let b = pool.find((x) => x !== a && x.lane === a?.lane && Math.abs(x.pos - (a?.pos ?? 0)) < 0.12);
  if (!a) a = spawnVehicle(w, t, { pos: 0.48, lane: 1, status: "stopped", speed: 0 }) ?? undefined;
  if (!a) return;
  if (!b) {
    b = spawnVehicle(w, t, {
      pos: Math.max(0.02, a.pos - 0.018),
      lane: a.lane,
      status: "stopped",
      speed: 0,
      type: "car",
    }) ?? undefined;
  }
  a.status = "crashed";
  a.speed = 0;
  if (b) {
    b.status = "crashed";
    b.speed = 0;
    b.pos = a.pos - (a.length + 1.2) / LENGTH;
  }
  const ids = b ? [a.id, b.id] : [a.id];
  beginIncident(w, "accident", t, a.pos, ids, true);
}

export function injectStopped(w: World, tube?: TubeId): void {
  const t: TubeId = tube ?? "eastbound";
  let v = w.vehicles.find((x) => x.tube === t && x.pos > 0.3 && x.pos < 0.6);
  if (!v) v = spawnVehicle(w, t, { pos: 0.4, lane: 1, status: "stopped", speed: 0 }) ?? undefined;
  if (!v) return;
  v.status = "stopped";
  v.speed = 0;
  v.targetSpeed = 0;
  beginIncident(w, "stopped", t, v.pos, [v.id], true);
}

export function injectHeight(w: World): void {
  const tube: TubeId = Math.random() < 0.5 ? "eastbound" : "westbound";
  const v = spawnVehicle(w, tube, { pos: 0.012, type: "truck", lane: 1, speed: 4, status: "stopped" });
  if (!v) return;
  v.status = "stopped";
  v.speed = 0;
  beginIncident(w, "height", tube, v.pos, [v.id], true);
}

export function clearScene(w: World): void {
  for (const inc of w.incidents) inc.phase = "clearing";
  w.incidents = [];
  w.evacuees = [];
  w.vehicles = w.vehicles.filter((v) => v.status !== "burning" && v.status !== "crashed");
  for (const v of w.vehicles) {
    if (v.status === "stopped") {
      v.status = "driving";
      v.targetSpeed = vehicleSpec(v.type).speed;
    }
  }
  w.pendingProtocol = null;
  resetTargetsIdle(w);
  pushAlarm(w, "info", "SCADA", "Incident cleared — tubes released to traffic", "A12");
}

export function ackAlarm(w: World, id: string): void {
  const a = w.alarms.find((x) => x.id === id);
  if (a) a.acked = true;
  const inc = w.incidents.find((i) => !i.acknowledged);
  if (inc && a?.level === "alarm") inc.acknowledged = true;
}

export function ackAll(w: World): void {
  for (const a of w.alarms) a.acked = true;
  for (const i of w.incidents) i.acknowledged = true;
}

function occupancy(w: World, tube: TubeId): number[] {
  const bins = Array.from({ length: ZONE_COUNT }, () => 0);
  for (const v of w.vehicles) {
    if (v.tube !== tube) continue;
    const z = vehicleWorldZ(tube, v.pos);
    const i = clamp(Math.floor(z / ZONE_M), 0, ZONE_COUNT - 1);
    bins[i] += v.type === "truck" || v.type === "bus" ? 1.6 : 1;
  }
  return bins.map((n) => clamp(n / 6, 0, 1));
}

function avgSpeed(w: World, tube: TubeId): number {
  const list = w.vehicles.filter((v) => v.tube === tube);
  if (!list.length) return 80;
  return kmh(list.reduce((s, v) => s + v.speed, 0) / list.length);
}

export function deriveStatus(w: World): AppStatus {
  const inc = activeIncident(w);
  if (inc?.type === "fire") return "closed";
  if (w.closed.eastbound && w.closed.westbound) return "closed";
  if (inc) return "incident";
  if (w.closed.eastbound || w.closed.westbound) return "degraded";
  return "operational";
}

export function takeSnapshot(w: World): Snapshot {
  return {
    simTime: w.simTime,
    status: deriveStatus(w),
    vehicleCount: {
      eastbound: w.vehicles.filter((v) => v.tube === "eastbound").length,
      westbound: w.vehicles.filter((v) => v.tube === "westbound").length,
    },
    avgSpeedKmh: {
      eastbound: avgSpeed(w, "eastbound"),
      westbound: avgSpeed(w, "westbound"),
    },
    occupancy: {
      eastbound: occupancy(w, "eastbound"),
      westbound: occupancy(w, "westbound"),
    },
    systems: { ...w.systems, lighting: { ...w.systems.lighting }, ventPower: { ...w.systems.ventPower }, barrier: { ...w.systems.barrier }, trafficLight: { ...w.systems.trafficLight }, pumpLevel: { ...w.systems.pumpLevel }, pumpOn: { ...w.systems.pumpOn }, matrix: { ...w.systems.matrix } },
    alarms: w.alarms.slice(0, 24),
    incidents: w.incidents.map((i) => ({ ...i, vehicleIds: [...i.vehicleIds] })),
    evacuees: w.evacuees.length,
    closed: { ...w.closed },
    emergencyEta: w.emergencyEta,
    emergencyArrived: w.emergencyArrived,
    unacked: w.alarms.filter((a) => !a.acked && a.level !== "info").length,
  };
}

let acc = 0;

export function tickWorld(dt: number): void {
  const capped = Math.min(dt, 0.1);
  acc += capped;
  let steps = 0;
  while (acc >= STEP && steps < 8) {
    acc -= STEP;
    steps += 1;
    world.simTime += STEP;
    world.frame += 1;
    stepVehicles(world, STEP);
    stepIncidents(world, STEP);
    stepEvacuees(world, STEP);
    stepSystems(world, STEP);
    if (world.frame % 15 === 0) detectAid(world);
  }
}

export function resetWorld(): void {
  const next = createWorld();
  Object.assign(world, next);
  acc = 0;
}

export { DOOR_M };
