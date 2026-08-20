import { useEffect, useRef } from "react";
import {
  CAMERA_M,
  DOOR_M,
  FAN_M,
  LENGTH,
  PALETTE,
  POST_M,
  ZONE_COUNT,
  vehicleWorldZ,
} from "@/lib/tunnel/constants";
import { world } from "@/lib/tunnel/simulation";
import { useTunnel } from "@/lib/tunnel/store";
import type { TubeId } from "@/lib/tunnel/types";

type Rect = { x: number; y: number; w: number; h: number };

type Hit =
  | { kind: "vehicle"; id: string }
  | { kind: "camera"; id: string }
  | { kind: "door"; z: number };

function layout(w: number, h: number) {
  const pad = 12;
  const labelW = w < 640 ? 36 : 70;
  const portalW = w < 640 ? 22 : 32;
  const footer = 22;
  const header = 22;
  const innerX = pad + labelW + portalW;
  const innerW = Math.max(80, w - innerX - portalW - pad);
  const gap = 5;
  const usable = Math.max(80, h - header - footer - pad * 2);
  const tubeH = usable * 0.37;
  const chH = usable * 0.18;
  const y0 = pad + header;
  const wb: Rect = { x: innerX, y: y0, w: innerW, h: tubeH };
  const ch: Rect = { x: innerX, y: y0 + tubeH + gap, w: innerW, h: chH };
  const eb: Rect = { x: innerX, y: y0 + tubeH + gap + chH + gap, w: innerW, h: tubeH };
  return { pad, labelW, portalW, innerX, innerW, wb, ch, eb, header, footer, w, h };
}

function mx(rect: Rect, meters: number): number {
  return rect.x + (meters / LENGTH) * rect.w;
}

function laneY(rect: Rect, tube: TubeId, lane: 0 | 1): number {
  const top = rect.y + rect.h * 0.18;
  const bot = rect.y + rect.h * 0.82;
  if (tube === "westbound") return lane === 0 ? bot - (bot - top) * 0.33 : top + (bot - top) * 0.22;
  return lane === 0 ? top + (bot - top) * 0.22 : bot - (bot - top) * 0.33;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawTube(ctx: CanvasRenderingContext2D, rect: Rect, closed: boolean) {
  ctx.fillStyle = PALETTE.asphalt;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
  ctx.fill();
  if (closed) {
    ctx.fillStyle = "rgba(226,75,75,0.10)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.strokeStyle = PALETTE.asphaltEdge;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "rgba(207,214,221,0.35)";
  ctx.setLineDash([7, 9]);
  ctx.lineWidth = 1;
  const mid = rect.y + rect.h / 2;
  ctx.beginPath();
  ctx.moveTo(rect.x + 4, mid);
  ctx.lineTo(rect.x + rect.w - 4, mid);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(207,214,221,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + 4);
  ctx.lineTo(rect.x + rect.w, rect.y + 4);
  ctx.moveTo(rect.x, rect.y + rect.h - 4);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h - 4);
  ctx.stroke();
}

function occupancyColor(v: number): string {
  if (v < 0.25) return "rgba(61,186,126,0.16)";
  if (v < 0.55) return "rgba(201,162,39,0.22)";
  return "rgba(226,75,75,0.28)";
}

export function Schematic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitsRef = useRef<Array<{ hit: Hit; x: number; y: number; r: number }>>([]);
  const setSelected = useTunnel((s) => s.setSelected);
  const selected = useTunnel((s) => s.selected);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    let raf = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const draw = () => {
      if (!running) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, w, h);

      const L = layout(w, h);
      const hits: typeof hitsRef.current = [];
      const sys = world.systems;
      const t = world.simTime;

      ctx.fillStyle = PALETTE.muted;
      ctx.font = "500 11px Barlow, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WEST PORTAL", L.wb.x - L.portalW / 2, L.header);
      ctx.fillText("EAST PORTAL", L.wb.x + L.wb.w + L.portalW / 2, L.header);

      ctx.textAlign = "right";
      ctx.fillStyle = PALETTE.subtle;
      ctx.font = "500 10px IBM Plex Mono, monospace";
      ctx.fillText("WB", L.wb.x - L.portalW - 6, L.wb.y + L.wb.h / 2 + 3);
      ctx.fillText("ESC", L.ch.x - L.portalW - 6, L.ch.y + L.ch.h / 2 + 3);
      ctx.fillText("EB", L.eb.x - L.portalW - 6, L.eb.y + L.eb.h / 2 + 3);

      drawTube(ctx, L.wb, world.closed.westbound);
      ctx.fillStyle = PALETTE.channel;
      roundRect(ctx, L.ch.x, L.ch.y, L.ch.w, L.ch.h, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(61,186,126,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
      drawTube(ctx, L.eb, world.closed.eastbound);

      const occW = world.vehicles.reduce<number[]>((acc, v) => {
        if (v.tube !== "westbound") return acc;
        const z = vehicleWorldZ("westbound", v.pos);
        const i = Math.min(ZONE_COUNT - 1, Math.max(0, Math.floor(z / (LENGTH / ZONE_COUNT))));
        acc[i] = (acc[i] ?? 0) + 1;
        return acc;
      }, Array.from({ length: ZONE_COUNT }, () => 0));
      const occE = world.vehicles.reduce<number[]>((acc, v) => {
        if (v.tube !== "eastbound") return acc;
        const z = vehicleWorldZ("eastbound", v.pos);
        const i = Math.min(ZONE_COUNT - 1, Math.max(0, Math.floor(z / (LENGTH / ZONE_COUNT))));
        acc[i] = (acc[i] ?? 0) + 1;
        return acc;
      }, Array.from({ length: ZONE_COUNT }, () => 0));

      const paintOcc = (rect: Rect, bins: number[]) => {
        const zw = rect.w / ZONE_COUNT;
        bins.forEach((n, i) => {
          ctx.fillStyle = occupancyColor(n / 6);
          ctx.fillRect(rect.x + i * zw, rect.y, zw, rect.h);
        });
      };
      paintOcc(L.wb, occW);
      paintOcc(L.eb, occE);

      for (const inc of world.incidents) {
        if (inc.type !== "fire" || inc.smoke <= 0) continue;
        const rect = inc.tube === "eastbound" ? L.eb : L.wb;
        const dir = inc.tube === "eastbound" ? 1 : -1;
        const z0 = inc.z;
        const z1 = inc.z + dir * inc.smoke;
        const xa = mx(rect, Math.min(z0, z1));
        const xb = mx(rect, Math.max(z0, z1));
        const g = ctx.createLinearGradient(xa, 0, xb, 0);
        g.addColorStop(0, "rgba(160,168,176,0.38)");
        g.addColorStop(1, "rgba(160,168,176,0.02)");
        ctx.fillStyle = g;
        ctx.fillRect(xa, rect.y, Math.max(4, xb - xa), rect.h);
      }

      for (const d of DOOR_M) {
        const x = mx(L.ch, d);
        ctx.fillStyle = `rgba(61,186,126,${0.35 + sys.escapeLighting * 0.5})`;
        ctx.fillRect(x - 3, L.wb.y + L.wb.h - 3, 6, L.eb.y - (L.wb.y + L.wb.h) + 6);
        ctx.fillStyle = "#3dba7e";
        ctx.fillRect(x - 2, L.ch.y + 2, 4, L.ch.h - 4);
        hits.push({ hit: { kind: "door", z: d }, x, y: L.ch.y + L.ch.h / 2, r: 10 });
      }

      for (const m of POST_M) {
        for (const rect of [L.wb, L.eb]) {
          ctx.fillStyle = "#8a3030";
          ctx.fillRect(mx(rect, m) - 2, rect.y + rect.h - 8, 4, 6);
        }
      }

      for (const m of FAN_M) {
        const spin = t * (0.8 + sys.ventPower.westbound * 8);
        for (const [rect, power] of [
          [L.wb, sys.ventPower.westbound],
          [L.eb, sys.ventPower.eastbound],
        ] as const) {
          const x = mx(rect, m);
          const y = rect.y + 8;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(spin * (power > 0.1 ? 1 : 0.05));
          ctx.strokeStyle = PALETTE.accent;
          ctx.globalAlpha = 0.45 + power * 0.55;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-5, 0);
          ctx.lineTo(5, 0);
          ctx.moveTo(0, -5);
          ctx.lineTo(0, 5);
          ctx.stroke();
          ctx.restore();
        }
      }

      for (const m of CAMERA_M) {
        for (const [rect, prefix] of [
          [L.wb, "W"],
          [L.eb, "E"],
        ] as const) {
          const id = `CCTV-${prefix}-${String(CAMERA_M.indexOf(m) + 1).padStart(2, "0")}`;
          const x = mx(rect, m);
          const y = rect.y + 3;
          const sel = selectedRef.current === id;
          ctx.fillStyle = sel ? PALETTE.fg : PALETTE.info;
          ctx.beginPath();
          ctx.moveTo(x - 4, y);
          ctx.lineTo(x + 4, y);
          ctx.lineTo(x, y + 6);
          ctx.closePath();
          ctx.fill();
          hits.push({ hit: { kind: "camera", id }, x, y: y + 3, r: 8 });
        }
      }

      const drawPortal = (side: "west" | "east") => {
        const x = side === "west" ? L.wb.x - L.portalW : L.wb.x + L.wb.w;
        const y1 = L.wb.y;
        const y2 = L.eb.y + L.eb.h;
        ctx.fillStyle = PALETTE.elevated;
        ctx.fillRect(x, y1, L.portalW, y2 - y1);
        ctx.strokeStyle = PALETTE.border;
        ctx.strokeRect(x + 0.5, y1 + 0.5, L.portalW - 1, y2 - y1 - 1);

        const light = sys.trafficLight[side];
        const cy = L.ch.y + L.ch.h / 2;
        const cx = x + L.portalW / 2;
        ctx.fillStyle = light === "red" ? PALETTE.alarm : light === "amber" ? PALETTE.warn : PALETTE.ok;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        const closed = sys.barrier[side];
        ctx.strokeStyle = PALETTE.alarm;
        ctx.globalAlpha = 0.4 + closed * 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (closed > 0.5) {
          ctx.moveTo(cx, y1 + 8);
          ctx.lineTo(cx, y2 - 8);
        } else {
          ctx.moveTo(cx - 6, y1 + 10);
          ctx.lineTo(cx, y1 + 4);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = PALETTE.muted;
        ctx.font = "600 8px IBM Plex Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText(sys.matrix[side], cx, y2 + 12);
      };
      drawPortal("west");
      drawPortal("east");

      for (const v of world.vehicles) {
        const rect = v.tube === "eastbound" ? L.eb : L.wb;
        const z = vehicleWorldZ(v.tube, v.pos);
        const x = mx(rect, z);
        const y = laneY(rect, v.tube, v.lane);
        const pxLen = Math.max(8, (v.length / LENGTH) * rect.w);
        const pxW = Math.max(5, rect.h * 0.16);
        const dir = v.tube === "eastbound" ? 1 : -1;
        ctx.save();
        ctx.translate(x, y);
        if (v.status === "burning") {
          const flick = 0.55 + Math.sin(t * 14 + x) * 0.35;
          ctx.shadowColor = PALETTE.fire;
          ctx.shadowBlur = 12 * flick;
        }
        ctx.fillStyle = v.status === "burning" ? PALETTE.fire : v.status === "crashed" ? "#6a2a2a" : v.color;
        roundRect(ctx, -pxLen / 2, -pxW / 2, pxLen, pxW, 1.5);
        ctx.fill();
        ctx.fillStyle = PALETTE.headlight;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(dir * (pxLen / 2 - 2) - 1.5, -pxW / 2 + 1, 3, pxW - 2);
        ctx.globalAlpha = 1;
        ctx.restore();
        hits.push({ hit: { kind: "vehicle", id: v.id }, x, y, r: 10 });
      }

      for (const e of world.evacuees) {
        const x = mx(L.ch, e.z);
        const y =
          Math.abs(e.x) < 1.2
            ? L.ch.y + L.ch.h / 2
            : e.x < 0
              ? L.wb.y + L.wb.h - 6
              : L.eb.y + 6;
        ctx.fillStyle = PALETTE.fg;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const inc of world.incidents) {
        const rect = inc.tube === "eastbound" ? L.eb : L.wb;
        const x = mx(rect, inc.z);
        const y = rect.y + 12;
        ctx.fillStyle = inc.type === "fire" ? PALETTE.fire : PALETTE.alarm;
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 6, y + 4);
        ctx.lineTo(x - 6, y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.fg;
        ctx.font = "700 8px IBM Plex Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", x, y + 2);
      }

      ctx.fillStyle = PALETTE.subtle;
      ctx.font = "400 10px IBM Plex Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText("0 m", L.wb.x, h - 8);
      ctx.textAlign = "center";
      ctx.fillText("400 m", L.wb.x + L.wb.w / 2, h - 8);
      ctx.textAlign = "right";
      ctx.fillText("800 m", L.wb.x + L.wb.w, h - 8);

      ctx.textAlign = "left";
      ctx.fillStyle = PALETTE.muted;
      ctx.font = "500 10px Barlow, sans-serif";
      const legend = "Cameras  ·  Hulppost  ·  Jet fan  ·  Escape door  ·  Occupancy";
      ctx.fillText(legend, L.pad, L.header);

      hitsRef.current = hits;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      role="img"
      aria-label="Tunnel schematic: westbound tube, escape channel, eastbound tube"
      onClick={(e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        let best: (typeof hitsRef.current)[number] | null = null;
        let bestD = 14;
        for (const h of hitsRef.current) {
          const d = Math.hypot(h.x - x, h.y - y);
          if (d < bestD) {
            bestD = d;
            best = h;
          }
        }
        if (!best) {
          setSelected(null);
          return;
        }
        if (best.hit.kind === "vehicle") setSelected(best.hit.id);
        else if (best.hit.kind === "camera") setSelected(best.hit.id);
        else setSelected(`DOOR-${best.hit.z}`);
      }}
    />
  );
}
