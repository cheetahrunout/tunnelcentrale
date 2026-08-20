import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import {
  DOOR_M,
  FAN_M,
  LENGTH,
  PALETTE,
  laneWorldX,
  vehicleWorldZ,
} from "@/lib/tunnel/constants";
import { world } from "@/lib/tunnel/simulation";
import { useTunnel } from "@/lib/tunnel/store";
import type { CamPreset } from "@/lib/tunnel/types";

const MAX = 80;

const PRESETS: Record<CamPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [52, 48, 400], target: [0, 0, 400] },
  west: { pos: [18, 10, -28], target: [0, 2, 50] },
  east: { pos: [18, 10, 828], target: [0, 2, 750] },
  "wb-drive": { pos: [-7.5, 1.55, 24], target: [-7.5, 1.4, 70] },
  "eb-drive": { pos: [7.5, 1.55, 24], target: [7.5, 1.4, 70] },
  escape: { pos: [0, 1.5, 30], target: [0, 1.2, 80] },
  incident: { pos: [22, 8, 400], target: [7.5, 1, 400] },
};

function roadTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2a3038";
  g.fillRect(0, 0, 128, 512);
  g.fillStyle = "#3a414c";
  for (let i = 0; i < 80; i++) {
    g.fillRect(Math.random() * 128, Math.random() * 512, 2, 2);
  }
  g.fillStyle = "#d5dbe2";
  g.fillRect(8, 0, 4, 512);
  g.fillRect(116, 0, 4, 512);
  g.fillStyle = "#cfd6dd";
  for (let y = 0; y < 512; y += 48) g.fillRect(62, y, 4, 22);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 8);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wallSegments() {
  const segs: { from: number; to: number }[] = [];
  let z0 = 0;
  for (const d of DOOR_M) {
    segs.push({ from: z0, to: d - 0.75 });
    z0 = d + 0.75;
  }
  segs.push({ from: z0, to: LENGTH });
  return segs;
}

function TubeShell({
  centerX,
  lighting,
  innerSign,
  showCeiling,
}: {
  centerX: number;
  lighting: number;
  innerSign: 1 | -1;
  showCeiling: boolean;
}) {
  const tex = useMemo(() => roadTexture(), []);
  const segs = useMemo(() => wallSegments(), []);
  const emit = 0.15 + lighting * 0.7;
  const outerX = centerX + innerSign * -6.3;
  const innerX = centerX + innerSign * 5.5;
  return (
    <group>
      <mesh position={[centerX, -0.12, LENGTH / 2]} receiveShadow>
        <boxGeometry args={[11, 0.24, LENGTH]} />
        <meshStandardMaterial map={tex} roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh position={[outerX, 2.7, LENGTH / 2]}>
        <boxGeometry args={[0.55, 5.4, LENGTH]} />
        <meshStandardMaterial color="#3d4450" roughness={0.85} />
      </mesh>
      {segs.map((s) => {
        const len = s.to - s.from;
        if (len < 1) return null;
        return (
          <mesh key={s.from} position={[innerX, 2.7, (s.from + s.to) / 2]}>
            <boxGeometry args={[0.5, 5.4, len]} />
            <meshStandardMaterial color="#3d4450" roughness={0.85} />
          </mesh>
        );
      })}
      {DOOR_M.map((z) => (
        <group key={z}>
          <mesh position={[innerX, 3.85, z]}>
            <boxGeometry args={[0.5, 3.1, 1.5]} />
            <meshStandardMaterial color="#3d4450" />
          </mesh>
          <mesh position={[innerX + innerSign * 0.02, 1.1, z]}>
            <boxGeometry args={[0.12, 2.2, 1.35]} />
            <meshStandardMaterial
              color="#1f3d32"
              emissive="#3dba7e"
              emissiveIntensity={0.4 + lighting * 0.4}
            />
          </mesh>
        </group>
      ))}
      {showCeiling ? (
      <mesh position={[centerX, 5.45, LENGTH / 2]}>
        <boxGeometry args={[11, 0.28, LENGTH]} />
        <meshStandardMaterial color="#2c333d" roughness={0.8} />
      </mesh>
      ) : null}
      <mesh position={[centerX, 5.28, LENGTH / 2]}>
        <boxGeometry args={[0.18, 0.06, LENGTH]} />
        <meshStandardMaterial
          color="#dfe7ee"
          emissive="#f4f7fa"
          emissiveIntensity={emit}
        />
      </mesh>
      <mesh position={[centerX - 4.2, 5.28, LENGTH / 2]}>
        <boxGeometry args={[0.1, 0.05, LENGTH]} />
        <meshStandardMaterial color="#dfe7ee" emissive="#e8edf2" emissiveIntensity={emit * 0.6} />
      </mesh>
      <mesh position={[centerX + 4.2, 5.28, LENGTH / 2]}>
        <boxGeometry args={[0.1, 0.05, LENGTH]} />
        <meshStandardMaterial color="#dfe7ee" emissive="#e8edf2" emissiveIntensity={emit * 0.6} />
      </mesh>
    </group>
  );
}

function SafetyChannel({ lighting, showCeiling }: { lighting: number; showCeiling: boolean }) {
  return (
    <group>
      <mesh position={[0, -0.05, LENGTH / 2]}>
        <boxGeometry args={[2.4, 0.2, LENGTH]} />
        <meshStandardMaterial color="#1a2a24" roughness={0.9} />
      </mesh>
      {showCeiling ? (
      <mesh position={[0, 3.1, LENGTH / 2]}>
        <boxGeometry args={[2.4, 0.2, LENGTH]} />
        <meshStandardMaterial color="#24332c" />
      </mesh>
      ) : null}
      <mesh position={[0, 3.0, LENGTH / 2]}>
        <boxGeometry args={[0.12, 0.05, LENGTH]} />
        <meshStandardMaterial
          color="#7dffb2"
          emissive="#3dba7e"
          emissiveIntensity={0.3 + lighting * 1.2}
        />
      </mesh>
    </group>
  );
}

function JetFans({ x, tube }: { x: number; tube: "westbound" | "eastbound" }) {
  const refs = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    const power = world.systems.ventPower[tube];
    for (const g of refs.current) {
      if (g) g.rotation.z += power * 14 * d;
    }
  });
  return (
    <>
      {FAN_M.map((z, i) => (
        <group key={z} position={[x, 4.85, z]}>
          <mesh>
            <cylinderGeometry args={[0.62, 0.62, 0.36, 12]} />
            <meshStandardMaterial color="#4a5360" metalness={0.4} roughness={0.4} />
          </mesh>
          <group
            ref={(el) => {
              if (el) refs.current[i] = el;
            }}
          >
            <mesh>
              <boxGeometry args={[1.15, 0.06, 0.1]} />
              <meshStandardMaterial color="#8aa4b8" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[1.15, 0.06, 0.1]} />
              <meshStandardMaterial color="#8aa4b8" />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

function Vehicles() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const n = Math.min(world.vehicles.length, MAX);
    for (let i = 0; i < n; i++) {
      const v = world.vehicles[i]!;
      dummy.position.set(laneWorldX(v.tube, v.lane), 0.55, vehicleWorldZ(v.tube, v.pos));
      dummy.rotation.set(0, v.tube === "eastbound" ? 0 : Math.PI, 0);
      dummy.scale.set(1.8, v.type === "truck" || v.type === "bus" ? 2.2 : 1.35, v.length);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (v.status === "burning") color.set(PALETTE.fire);
      else if (v.status === "crashed") color.set("#5a2222");
      else color.set(v.color);
      m.setColorAt(i, color);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.45} metalness={0.15} />
    </instancedMesh>
  );
}

function Evacuees3D() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const n = Math.min(world.evacuees.length, 40);
    for (let i = 0; i < n; i++) {
      const e = world.evacuees[i]!;
      dummy.position.set(e.x, 0.85, e.z);
      dummy.scale.set(0.35, 1.7, 0.35);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 40]}>
      <capsuleGeometry args={[0.5, 0.6, 4, 8]} />
      <meshStandardMaterial color="#d9dee6" />
    </instancedMesh>
  );
}

function FireFX() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const inc = world.incidents.find((i) => i.type === "fire" && i.phase !== "clearing");
    g.visible = !!inc;
    if (!inc) return;
    const x = inc.tube === "eastbound" ? 7.5 : -7.5;
    g.position.set(x, 0.4, inc.z);
  });
  return (
    <group ref={group} visible={false}>
      <pointLight color="#ff6a2a" intensity={14} distance={70} />
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[1.15, 10, 8]} />
        <meshStandardMaterial
          color="#ff9a3a"
          emissive="#ff6a2a"
          emissiveIntensity={2.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0.3, 1.8, 0.1]}>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb020" emissiveIntensity={2} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function SmokeFX() {
  const meshes = useRef<THREE.Mesh[]>([]);
  useFrame(() => {
    const inc = world.incidents.find((i) => i.type === "fire" && i.phase !== "clearing");
    for (let i = 0; i < meshes.current.length; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      if (!inc) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const dir = inc.tube === "eastbound" ? 1 : -1;
      const d = (i / 11) * inc.smoke;
      const x = inc.tube === "eastbound" ? 7.5 : -7.5;
      mesh.position.set(x, 2.1 + i * 0.12, inc.z + dir * d);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.32 * (1 - i / 12) * Math.min(1, inc.heat + 0.45);
    }
  });
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshes.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[1.6 + i * 0.28, 10, 8]} />
          <meshStandardMaterial color="#9aa3ab" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function Barriers() {
  const west = useRef<THREE.Group>(null);
  const east = useRef<THREE.Group>(null);
  useFrame(() => {
    if (west.current) west.current.rotation.z = -Math.PI / 2 + world.systems.barrier.west * (Math.PI / 2);
    if (east.current) east.current.rotation.z = -Math.PI / 2 + world.systems.barrier.east * (Math.PI / 2);
  });
  return (
    <>
      <group position={[7.5, 1.2, -2]}>
        <mesh position={[-5.2, 0.6, 0]}>
          <boxGeometry args={[0.25, 2.2, 0.25]} />
          <meshStandardMaterial color="#3a414c" />
        </mesh>
        <group ref={west} position={[-5.2, 1.5, 0]}>
          <mesh position={[2.6, 0, 0]}>
            <boxGeometry args={[5.2, 0.14, 0.18]} />
            <meshStandardMaterial color="#e24b4b" />
          </mesh>
        </group>
      </group>
      <group position={[-7.5, 1.2, LENGTH + 2]}>
        <mesh position={[5.2, 0.6, 0]}>
          <boxGeometry args={[0.25, 2.2, 0.25]} />
          <meshStandardMaterial color="#3a414c" />
        </mesh>
        <group ref={east} position={[5.2, 1.5, 0]}>
          <mesh position={[-2.6, 0, 0]}>
            <boxGeometry args={[5.2, 0.14, 0.18]} />
            <meshStandardMaterial color="#e24b4b" />
          </mesh>
        </group>
      </group>
    </>
  );
}

function Portals() {
  return (
    <>
      {([-8, LENGTH + 8] as const).map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 6.3, 0]}>
            <boxGeometry args={[34, 1.8, 5]} />
            <meshStandardMaterial color="#4a5562" roughness={0.9} />
          </mesh>
          <mesh position={[-16, 3.1, 0]}>
            <boxGeometry args={[3, 7.4, 5]} />
            <meshStandardMaterial color="#4a5562" roughness={0.9} />
          </mesh>
          <mesh position={[16, 3.1, 0]}>
            <boxGeometry args={[3, 7.4, 5]} />
            <meshStandardMaterial color="#4a5562" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.1, 0]}>
            <boxGeometry args={[2.8, 7.4, 5]} />
            <meshStandardMaterial color="#3d4a42" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, LENGTH / 2]} receiveShadow>
        <planeGeometry args={[220, LENGTH + 180]} />
        <meshStandardMaterial color="#1b2118" />
      </mesh>
    </>
  );
}

function CameraRig({ preset }: { preset: CamPreset }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  const driveZ = useRef(24);

  useEffect(() => {
    const p = PRESETS[preset];
    camera.position.set(...p.pos);
    driveZ.current = p.pos[2];
    if (controls) {
      controls.target.set(...p.target);
      controls.update();
    } else {
      camera.lookAt(...p.target);
    }
  }, [preset, camera, controls]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    if (preset === "wb-drive" || preset === "eb-drive" || preset === "escape") {
      driveZ.current += 22 * d;
      if (driveZ.current > LENGTH - 20) driveZ.current = 16;
      const x = preset === "wb-drive" ? -7.5 : preset === "eb-drive" ? 7.5 : 0;
      camera.position.set(x, 1.55, driveZ.current);
      camera.lookAt(x, 1.35, driveZ.current + 40);
    }
    if (preset === "incident") {
      const inc = world.incidents[0];
      if (inc) {
        const x = inc.tube === "eastbound" ? 18 : -18;
        camera.position.set(x, 7, inc.z - 18);
        if (controls) {
          controls.target.set(inc.tube === "eastbound" ? 7.5 : -7.5, 1, inc.z);
          controls.update();
        }
      }
    }
  });
  return null;
}

function Scene() {
  const preset = useTunnel((s) => s.camPreset);
  const showCeiling = preset === "wb-drive" || preset === "eb-drive" || preset === "escape";
  const lightingW = useTunnel((s) => s.snapshot.systems.lighting.westbound);
  const lightingE = useTunnel((s) => s.snapshot.systems.lighting.eastbound);
  const escapeL = useTunnel((s) => s.snapshot.systems.escapeLighting);

  return (
    <>
      <color attach="background" args={["#141c24"]} />
      <fog attach="fog" args={["#141c24", 70, 820]} />
      <ambientLight intensity={0.18} />
      <hemisphereLight args={["#6a8499", "#1a1510", 0.35]} />
      <directionalLight position={[-40, 50, -80]} intensity={0.55} color="#c9d6e2" />
      <TubeShell centerX={-7.5} lighting={lightingW} innerSign={1} showCeiling={showCeiling} />
      <TubeShell centerX={7.5} lighting={lightingE} innerSign={-1} showCeiling={showCeiling} />
      <SafetyChannel lighting={escapeL} showCeiling={showCeiling} />
      <JetFans x={-7.5} tube="westbound" />
      <JetFans x={7.5} tube="eastbound" />
      <Vehicles />
      <Evacuees3D />
      <FireFX />
      <SmokeFX />
      <Barriers />
      <Portals />
      <CameraRig preset={preset} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={8}
        maxDistance={220}
        enabled={preset === "overview" || preset === "west" || preset === "east" || preset === "incident"}
      />
    </>
  );
}

const CAM_BTNS: { id: CamPreset; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "west", label: "West" },
  { id: "east", label: "East" },
  { id: "wb-drive", label: "WB drive" },
  { id: "eb-drive", label: "EB drive" },
  { id: "escape", label: "Escape" },
  { id: "incident", label: "Incident" },
];

export function View3D() {
  const [ready, setReady] = useState(false);
  const preset = useTunnel((s) => s.camPreset);
  const setCam = useTunnel((s) => s.setCam);

  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-sm text-muted">
        Loading spatial view
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full bg-bg">
      <Canvas
        camera={{ position: [52, 48, 400], fov: 50, near: 0.4, far: 2600 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene />
      </Canvas>
      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
        {CAM_BTNS.map((b) => (
          <Button
            key={b.id}
            size="sm"
            variant={preset === b.id ? "primary" : "muted"}
            onClick={() => setCam(b.id)}
          >
            {b.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
