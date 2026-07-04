import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Login sahifasidagi premium 3D globus — Canvas 2D asosida.
 * Atmosfera halqasi, yulduzlar, orbital halqalar va shaharlar orasidagi
 * ma'lumot oqimlari (pulse) bilan "hayratlanarli" vizual effekt beradi.
 */
interface LoginGlobeProps {
  className?: string;
  size: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function latLonToVec3(latDeg: number, lonDeg: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.sin(lon),
  };
}

const HUB = { ...latLonToVec3(41.2995, 69.2401), color: "#7df9ff" };
const CITIES = [
  { pos: latLonToVec3(51.5074, -0.1278), name: "London" },
  { pos: latLonToVec3(40.7128, -74.006), name: "New York" },
  { pos: latLonToVec3(35.6762, 139.6503), name: "Tokyo" },
  { pos: latLonToVec3(25.2048, 55.2708), name: "Dubai" },
  { pos: latLonToVec3(39.9042, 116.4074), name: "Beijing" },
  { pos: latLonToVec3(48.8566, 2.3522), name: "Paris" },
  { pos: latLonToVec3(-33.8688, 151.2093), name: "Sydney" },
  { pos: latLonToVec3(1.3521, 103.8198), name: "Singapore" },
];

const LIGHT = normalize({ x: -0.5, y: 0.55, z: 1 });
const CANVAS_MARGIN_SCALE = 1.65;
const ARC_LIFT = 0.22;
/** Haqiqiy globusdek Y o'qi bo'ylab aylanish (rad/s) */
const ROTATION_SPEED = 0.42;

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const d = Math.max(-1, Math.min(1, dot(a, b)));
  const theta = Math.acos(d) * t;
  const relX = b.x - a.x * d;
  const relY = b.y - a.y * d;
  const relZ = b.z - a.z * d;
  const relLen = Math.hypot(relX, relY, relZ) || 1;
  const rx = relX / relLen;
  const ry = relY / relLen;
  const rz = relZ / relLen;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  return {
    x: a.x * cosT + rx * sinT,
    y: a.y * cosT + ry * sinT,
    z: a.z * cosT + rz * sinT,
  };
}

const SHADE_STEPS = 20;
const DOT_SHADES = Array.from({ length: SHADE_STEPS }, (_, i) => {
  const t = i / (SHADE_STEPS - 1);
  const r = Math.round(8 + 247 * Math.pow(t, 0.85));
  const g = Math.round(60 + 195 * Math.pow(t, 0.9));
  const b = Math.round(90 + 165 * Math.pow(t, 0.95));
  return `${r},${g},${b}`;
});

let landMaskPromise: Promise<ImageData> | null = null;
function loadLandMask(): Promise<ImageData> {
  if (!landMaskPromise) {
    landMaskPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.src = "/globe-texture.svg";
      img.onload = () => {
        const off = document.createElement("canvas");
        off.width = 360;
        off.height = 180;
        const ctx = off.getContext("2d");
        if (!ctx) {
          reject(new Error("2D kontekst yaratilmadi"));
          return;
        }
        ctx.drawImage(img, 0, 0, 360, 180);
        resolve(ctx.getImageData(0, 0, 360, 180));
      };
      img.onerror = () => reject(new Error("Xarita teksturasi yuklanmadi"));
    });
  }
  return landMaskPromise;
}

interface SpherePoints {
  xs: Float32Array;
  ys: Float32Array;
  zs: Float32Array;
  isLand: Uint8Array;
}

function buildSpherePoints(count: number, land: ImageData): SpherePoints {
  const xs = new Float32Array(count);
  const ys = new Float32Array(count);
  const zs = new Float32Array(count);
  const isLand = new Uint8Array(count);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    xs[i] = x;
    ys[i] = y;
    zs[i] = z;

    const lat = Math.asin(Math.max(-1, Math.min(1, y)));
    const lon = Math.atan2(z, x);
    const u = (lon / Math.PI + 1) / 2;
    const v = 0.5 - lat / Math.PI;
    const px = Math.min(land.width - 1, Math.max(0, Math.floor(u * land.width)));
    const py = Math.min(land.height - 1, Math.max(0, Math.floor(v * land.height)));
    const idx = (py * land.width + px) * 4;
    const lum = 0.299 * land.data[idx] + 0.587 * land.data[idx + 1] + 0.114 * land.data[idx + 2];
    isLand[i] = lum > 55 ? 1 : 0;
  }

  return { xs, ys, zs, isLand };
}

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

function buildStars(count: number, spread: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = spread * (0.55 + Math.random() * 0.45);
    stars.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      r: 0.4 + Math.random() * 1.4,
      alpha: 0.15 + Math.random() * 0.55,
      twinkleSpeed: 0.8 + Math.random() * 2.2,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function LoginGlobe({ className, size }: LoginGlobeProps) {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const phiRef = useRef(0.15);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);
  const bucketsRef = useRef(new Map<number, { path: Path2D; color: string; alpha: number }>());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let destroyed = false;
    let frame = 0;
    let points: SpherePoints | null = null;
    const pointCount = Math.round(Math.min(9000, Math.max(2800, size * 6.5)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvasSize = Math.round(size * CANVAS_MARGIN_SCALE);
    canvas.width = Math.round(canvasSize * dpr);
    canvas.height = Math.round(canvasSize * dpr);
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    canvas.style.left = `${(size - canvasSize) / 2}px`;
    canvas.style.top = `${(size - canvasSize) / 2}px`;
    ctx.scale(dpr, dpr);

    const THETA = 0.32;
    const cosTheta = Math.cos(THETA);
    const sinTheta = Math.sin(THETA);
    const R = size / 2 - 2;
    const CX = canvasSize / 2;
    const CY = canvasSize / 2;
    const baseDotR = Math.max(1.15, size / 280);
    const stars = buildStars(Math.round(size / 8), canvasSize * 0.48);

    const project = (v: Vec3, phi: number) => {
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const x1 = v.x * cosPhi + v.z * sinPhi;
      const z1 = -v.x * sinPhi + v.z * cosPhi;
      const y2 = v.y * cosTheta - z1 * sinTheta;
      const z2 = v.y * sinTheta + z1 * cosTheta;
      return { x: x1, y: y2, z: z2 };
    };

    const SAFE_R = R * 1.32;

    const drawStars = (t: number) => {
      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        const a = star.alpha * twinkle;
        ctx.beginPath();
        ctx.fillStyle = `rgba(200,230,255,${a})`;
        ctx.arc(CX + star.x, CY + star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawOrbitRing = (phi: number, tilt: number, scale: number, alpha: number, lineW: number) => {
      const STEPS = 64;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= STEPS; i++) {
        const angle = (i / STEPS) * Math.PI * 2;
        const v: Vec3 = {
          x: Math.cos(angle) * scale,
          y: Math.sin(angle) * Math.sin(tilt) * scale,
          z: Math.sin(angle) * Math.cos(tilt) * scale,
        };
        const p = project(v, phi);
        if (p.z <= -0.05) {
          started = false;
          continue;
        }
        const sx = CX + p.x * R;
        const sy = CY - p.y * R;
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.save();
      ctx.strokeStyle = `rgba(103,232,249,${alpha})`;
      ctx.lineWidth = lineW;
      ctx.shadowColor = "#67e8f9";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    };

    const drawArc = (from: Vec3, to: Vec3, phi: number, color: string, glow: number) => {
      const STEPS = 24;
      const pts: { sx: number; sy: number; fade: number }[] = [];
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const base = slerp(from, to, t);
        const lift = 1 + ARC_LIFT * Math.sin(t * Math.PI);
        const lifted = { x: base.x * lift, y: base.y * lift, z: base.z * lift };
        const p = project(lifted, phi);
        let sx = CX + p.x * R;
        let sy = CY - p.y * R;
        const dx = sx - CX;
        const dy = sy - CY;
        const dist = Math.hypot(dx, dy);
        if (dist > SAFE_R) {
          const scale = SAFE_R / dist;
          sx = CX + dx * scale;
          sy = CY + dy * scale;
        }
        const fade = Math.max(0, Math.min(1, (p.z + 0.04) / 0.16));
        pts.push({ sx, sy, fade });
      }

      const strokeTier = (predicate: (fade: number) => boolean, alpha: number, blur: number) => {
        let started = false;
        let hasAny = false;
        ctx.beginPath();
        for (const pt of pts) {
          if (!predicate(pt.fade)) {
            started = false;
            continue;
          }
          hasAny = true;
          if (!started) {
            ctx.moveTo(pt.sx, pt.sy);
            started = true;
          } else {
            ctx.lineTo(pt.sx, pt.sy);
          }
        }
        if (!hasAny) return;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.4, size / 360);
        ctx.lineCap = "round";
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.restore();
      };

      strokeTier((f) => f > 0.45, 0.95, glow);
      strokeTier((f) => f > 0.02 && f <= 0.45, 0.35, glow * 0.4);
    };

    const drawArcPulse = (from: Vec3, to: Vec3, phi: number, t: number, color: string) => {
      const pulseT = t % 1;
      const base = slerp(from, to, pulseT);
      const lift = 1 + ARC_LIFT * Math.sin(pulseT * Math.PI);
      const lifted = { x: base.x * lift, y: base.y * lift, z: base.z * lift };
      const p = project(lifted, phi);
      if (p.z <= 0.05) return;
      const sx = CX + p.x * R;
      const sy = CY - p.y * R;
      const r = Math.max(2, size / 200);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.5);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(0.4, color);
      grad.addColorStop(1, "rgba(103,232,249,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawMarker = (v: Vec3, phi: number, radius: number, color: string, glow: number) => {
      const p = project(v, phi);
      if (p.z <= 0.03) return;
      const sx = CX + p.x * R;
      const sy = CY - p.y * R;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 2);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, color);
      grad.addColorStop(1, "rgba(103,232,249,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawHubPulse = (phi: number, t: number) => {
      const p = project(HUB, phi);
      if (p.z <= 0.02) return;
      const sx = CX + p.x * R;
      const sy = CY - p.y * R;
      for (let i = 0; i < 3; i++) {
        const phase = (t * 0.8 + i * 0.33) % 1;
        const r = (size / 28) * (0.3 + phase * 1.8);
        const alpha = (1 - phase) * 0.45;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(125,249,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const render = (timestamp: number) => {
      if (destroyed) return;
      frame = requestAnimationFrame(render);
      if (!points) return;

      if (!reduceMotion) {
        const delta = lastFrameRef.current ? (timestamp - lastFrameRef.current) / 1000 : 0;
        lastFrameRef.current = timestamp;
        timeRef.current = timestamp * 0.001;
        if (pointerInteracting.current === null) {
          phiRef.current += ROTATION_SPEED * delta;
        }
      }
      const phi = phiRef.current + pointerMovement.current / 200;
      const t = timeRef.current;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      if (!reduceMotion) drawStars(t);

      const { xs, ys, zs, isLand } = points;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      const ALPHA_LEVELS = 8;
      const buckets = bucketsRef.current;
      buckets.clear();

      for (let i = 0; i < xs.length; i++) {
        const x = xs[i];
        const y = ys[i];
        const z = zs[i];
        const x1 = x * cosPhi + z * sinPhi;
        const z1 = -x * sinPhi + z * cosPhi;
        const y2 = y * cosTheta - z1 * sinTheta;
        const z2 = y * sinTheta + z1 * cosTheta;
        if (z2 <= 0.02) continue;

        const diffuse = Math.max(0, x1 * LIGHT.x + y2 * LIGHT.y + z2 * LIGHT.z);
        const intensity = 0.12 + 0.88 * Math.pow(diffuse, 0.85);
        const depthScale = 0.6 + 0.4 * z2;
        const edgeFade = Math.min(1, z2 / 0.18);

        const sx = CX + x1 * R;
        const sy = CY - y2 * R;
        const land = isLand[i] === 1;
        const r = land ? baseDotR * depthScale * 1.2 : baseDotR * depthScale * 0.35;
        const alpha = land ? edgeFade : 0.4 * edgeFade;
        const shadeSrc = land ? intensity : intensity * 0.38;
        const shadeIdx = Math.min(DOT_SHADES.length - 1, Math.round(shadeSrc * (DOT_SHADES.length - 1)));
        const alphaBucket = Math.max(1, Math.round(alpha * ALPHA_LEVELS));

        const key = (land ? 1 : 0) * 100000 + shadeIdx * ALPHA_LEVELS + alphaBucket;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { path: new Path2D(), color: DOT_SHADES[shadeIdx], alpha: alphaBucket / ALPHA_LEVELS };
          buckets.set(key, bucket);
        }
        bucket.path.moveTo(sx + r, sy);
        bucket.path.arc(sx, sy, r, 0, Math.PI * 2);
      }

      for (const bucket of buckets.values()) {
        ctx.fillStyle = `rgba(${bucket.color},${bucket.alpha})`;
        ctx.fill(bucket.path);
      }

      if (!reduceMotion) {
        drawOrbitRing(phi, 0.55, 1.12, 0.35, 0.8);
        drawOrbitRing(phi + 0.4, 1.1, 1.18, 0.22, 0.6);
        drawOrbitRing(phi + 0.9, 1.65, 1.08, 0.18, 0.5);
      }

      const arcGlow = Math.max(4, size / 90);
      CITIES.forEach((city, idx) => {
        drawArc(HUB, city.pos, phi, "rgba(56,189,248,0.7)", arcGlow);
        if (!reduceMotion) {
          const pulseT = (t * 0.35 + idx * 0.125) % 1;
          drawArcPulse(HUB, city.pos, phi, pulseT, "rgba(165,243,252,0.9)");
        }
      });

      if (!reduceMotion) drawHubPulse(phi, t);

      CITIES.forEach((city) => {
        drawMarker(city.pos, phi, Math.max(2.2, size / 170), "#a5f3fc", 12);
      });
      drawMarker(HUB, phi, Math.max(3.5, size / 110), HUB.color, 22);

      pointerMovement.current *= 0.94;
      if (Math.abs(pointerMovement.current) < 0.05) pointerMovement.current = 0;
    };

    loadLandMask()
      .then((mask) => {
        if (destroyed) return;
        points = buildSpherePoints(pointCount, mask);
        setReady(true);
        frame = requestAnimationFrame(render);
      })
      .catch(() => setReady(true));

    const onPointerDown = (e: PointerEvent) => {
      pointerInteracting.current = e.clientX - pointerMovement.current;
      canvas.style.cursor = "grabbing";
    };
    const onPointerUp = () => {
      pointerInteracting.current = null;
      canvas.style.cursor = "grab";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        pointerMovement.current = e.clientX - pointerInteracting.current;
      }
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [size, reduceMotion]);

  const canvasSize = size * CANVAS_MARGIN_SCALE;
  const canvasOffset = (size - canvasSize) / 2;

  return (
    <div className={`relative mx-auto ${className ?? ""}`} style={{ width: size, height: size }}>
      {/* Tashqi atmosfera halqasi — pulsatsiya */}
      <div
        className="pointer-events-none absolute -inset-[18%] rounded-full login-globe-halo"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-[8%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.14) 0%, rgba(99,102,241,0.1) 38%, transparent 68%)",
        }}
        aria-hidden
      />

      {/* Sfera tanasi */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, rgba(56,189,248,0.2) 0%, rgba(30,41,59,0.94) 44%, rgba(6,6,12,0.99) 78%)",
          boxShadow:
            "inset 0 0 60px rgba(0,0,0,0.55), inset 0 0 120px rgba(34,211,238,0.1), 0 0 90px rgba(99,102,241,0.22), 0 0 160px rgba(56,189,248,0.12)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 11.5%, rgba(103,232,249,0.14) 12%, transparent 12.5%)",
          }}
        />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute cursor-grab transition-opacity duration-700 ease-out"
        style={{
          width: canvasSize,
          height: canvasSize,
          left: canvasOffset,
          top: canvasOffset,
          opacity: ready ? 1 : 0,
        }}
        aria-hidden
      />

      {/* Yaltirash va rim light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <div
          className="absolute inset-0 login-globe-shimmer"
          style={{
            background:
              "radial-gradient(circle at 26% 20%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.09) 15%, transparent 38%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.42) 80%, rgba(0,0,0,0.7) 100%)",
          }}
        />
        <div className="absolute inset-0 rounded-full ring-1 ring-cyan-300/25" />
      </div>
    </div>
  );
}
