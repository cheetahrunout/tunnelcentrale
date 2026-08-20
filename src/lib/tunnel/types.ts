export type TubeId = "westbound" | "eastbound";
export type PortalId = "west" | "east";
export type VehicleType = "car" | "van" | "truck" | "bus";
export type VehicleStatus = "driving" | "braking" | "stopped" | "crashed" | "burning";
export type IncidentType = "accident" | "fire" | "stopped" | "height";
export type IncidentPhase =
  | "detected"
  | "responding"
  | "evacuating"
  | "contained"
  | "clearing";
export type LightState = "green" | "amber" | "red";
export type AppStatus = "operational" | "degraded" | "incident" | "closed";
export type ViewMode = "2d" | "3d";
export type CamPreset =
  | "overview"
  | "west"
  | "east"
  | "wb-drive"
  | "eb-drive"
  | "escape"
  | "incident";

export interface Vehicle {
  id: string;
  tube: TubeId;
  lane: 0 | 1;
  pos: number;
  speed: number;
  targetSpeed: number;
  type: VehicleType;
  color: string;
  length: number;
  status: VehicleStatus;
  stoppedFor: number;
  evacSpawned: boolean;
}

export interface Evacuee {
  id: string;
  z: number;
  x: number;
  stage: "to_door" | "corridor" | "exiting";
  doorZ: number;
  exitZ: number;
  speed: number;
}

export interface Incident {
  id: string;
  type: IncidentType;
  tube: TubeId;
  pos: number;
  z: number;
  startedAt: number;
  phase: IncidentPhase;
  vehicleIds: string[];
  smoke: number;
  heat: number;
  acknowledged: boolean;
}

export interface Alarm {
  id: string;
  t: number;
  level: "info" | "warning" | "alarm";
  system: string;
  message: string;
  loc: string;
  acked: boolean;
}

export interface Systems {
  lighting: Record<TubeId, number>;
  ventPower: Record<TubeId, number>;
  ventDir: Record<TubeId, 1 | -1>;
  barrier: Record<PortalId, number>;
  trafficLight: Record<PortalId, LightState>;
  firePump: boolean;
  overpressure: number;
  escapeLighting: number;
  pa: boolean;
  paMessage: string;
  pumpLevel: Record<PortalId, number>;
  pumpOn: Record<PortalId, boolean>;
  upsLoad: number;
  mains: boolean;
  matrix: Record<PortalId, string>;
  aidOnline: boolean;
  lbdOnline: boolean;
  cctvOnline: boolean;
  heightOnline: boolean;
}

export interface Targets {
  lighting: Record<TubeId, number>;
  ventPower: Record<TubeId, number>;
  barrier: Record<PortalId, number>;
  escapeLighting: number;
  overpressure: number;
}

export interface World {
  simTime: number;
  frame: number;
  vehicles: Vehicle[];
  evacuees: Evacuee[];
  incidents: Incident[];
  alarms: Alarm[];
  systems: Systems;
  targets: Targets;
  closed: Record<TubeId, boolean>;
  spawnAcc: Record<TubeId, number>;
  pendingProtocol: null | { kind: IncidentType; at: number; tube: TubeId };
  emergencyEta: number | null;
  emergencyArrived: boolean;
  density: number;
  autoResponse: boolean;
  seq: number;
}

export interface Snapshot {
  simTime: number;
  status: AppStatus;
  vehicleCount: Record<TubeId, number>;
  avgSpeedKmh: Record<TubeId, number>;
  occupancy: Record<TubeId, number[]>;
  systems: Systems;
  alarms: Alarm[];
  incidents: Incident[];
  evacuees: number;
  closed: Record<TubeId, boolean>;
  emergencyEta: number | null;
  emergencyArrived: boolean;
  unacked: number;
}
