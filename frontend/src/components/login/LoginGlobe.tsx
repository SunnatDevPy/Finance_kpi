import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/**
 * Login sahifasidagi premium 3D globus — Canvas 2D asosida.
 * Chekka: soft radial mask + transparent limb — kvadrat/doira chegarasi
 * sahifa foniga erib ketadi.
 */
interface LoginGlobeProps {
  className?: string;
  size: number;
  /** Mobil uchun yengil rejim — kam nuqta, kam effekt */
  lite?: boolean;
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
  { pos: latLonToVec3(55.7558, 37.6173), name: "Moscow" },
  { pos: latLonToVec3(41.0082, 28.9784), name: "Istanbul" },
  { pos: latLonToVec3(19.076, 72.8777), name: "Mumbai" },
  { pos: latLonToVec3(37.5665, 126.978), name: "Seoul" },
  { pos: latLonToVec3(50.1109, 8.6821), name: "Frankfurt" },
  { pos: latLonToVec3(43.6532, -79.3832), name: "Toronto" },
  { pos: latLonToVec3(30.0444, 31.2357), name: "Cairo" },
  { pos: latLonToVec3(-23.5505, -46.6333), name: "Sao Paulo" },
];

/** Hubdan mustaqil, shaharlar orasidagi to'g'ridan-to'g'ri yo'nalishlar —
 * globus qaysi burchakda bo'lmasin, doim ko'rinadigan chiziqlar bo'lishi uchun. */
const MESH_PAIRS: [string, string][] = [
  ["London", "New York"],
  ["Tokyo", "Singapore"],
  ["Dubai", "Mumbai"],
  ["Paris", "Frankfurt"],
  ["Sydney", "Singapore"],
  ["Moscow", "Istanbul"],
  ["New York", "Toronto"],
  ["Seoul", "Beijing"],
  ["Cairo", "Istanbul"],
  ["Sao Paulo", "New York"],
];

const LIGHT = normalize({ x: -0.45, y: 0.5, z: 1 });
/** Canvas globusdan kattaroq — soft fade kvadrat chekkadan oldin tugaydi */
const CANVAS_MARGIN_SCALE = 1.65;
const ARC_LIFT = 0.32;
const ROTATION_SPEED = 0.32;
const ARC_STEPS = 28;
const THETA = 0.2;
const COS_THETA = Math.cos(THETA);
const SIN_THETA = Math.sin(THETA);

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

const SHADE_STEPS = 14;
const DOT_SHADES = Array.from({ length: SHADE_STEPS }, (_, i) => {
  const t = i / (SHADE_STEPS - 1);
  const r = Math.round(110 + 145 * Math.pow(t, 0.85));
  const g = Math.round(185 + 70 * Math.pow(t, 0.9));
  const b = Math.round(235 + 20 * t);
  return `${r},${g},${b}`;
});

interface Arc3D {
  xs: Float32Array;
  ys: Float32Array;
  zs: Float32Array;
}

function buildArc3D(from: Vec3, to: Vec3): Arc3D {
  const n = ARC_STEPS + 1;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const zs = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / ARC_STEPS;
    const base = slerp(from, to, u);
    const lift = 1 + ARC_LIFT * Math.sin(u * Math.PI);
    xs[i] = base.x * lift;
    ys[i] = base.y * lift;
    zs[i] = base.z * lift;
  }
  return { xs, ys, zs };
}

const HUB_VEC: Vec3 = { x: HUB.x, y: HUB.y, z: HUB.z };
const ARCS_3D = CITIES.map((city) => buildArc3D(HUB_VEC, city.pos));

const CITY_POS_BY_NAME = new Map(CITIES.map((c) => [c.name, c.pos]));
const MESH_ARCS_3D = MESH_PAIRS.map(([a, b]) => {
  const from = CITY_POS_BY_NAME.get(a);
  const to = CITY_POS_BY_NAME.get(b);
  return buildArc3D(from ?? HUB_VEC, to ?? HUB_VEC);
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

interface LandPoints {
  xs: Float32Array;
  ys: Float32Array;
  zs: Float32Array;
  count: number;
}

function buildLandPoints(sampleCount: number, land: ImageData): LandPoints {
  const xs = new Float32Array(sampleCount);
  const ys = new Float32Array(sampleCount);
  const zs = new Float32Array(sampleCount);
  const golden = Math.PI * (3 - Math.sqrt(5));
  let landCount = 0;

  for (let i = 0; i < sampleCount; i++) {
    const y = 1 - (i / (sampleCount - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    const lat = Math.asin(Math.max(-1, Math.min(1, y)));
    const lon = Math.atan2(z, x);
    const u = (lon / Math.PI + 1) / 2;
    const v = 0.5 - lat / Math.PI;
    const px = Math.min(land.width - 1, Math.max(0, Math.floor(u * land.width)));
    const py = Math.min(land.height - 1, Math.max(0, Math.floor(v * land.height)));
    const idx = (py * land.width + px) * 4;
    const lum = 0.299 * land.data[idx] + 0.587 * land.data[idx + 1] + 0.114 * land.data[idx + 2];
    if (lum <= 55) continue;

    xs[landCount] = x;
    ys[landCount] = y;
    zs[landCount] = z;
    landCount++;
  }

  return {
    xs: xs.subarray(0, landCount),
    ys: ys.subarray(0, landCount),
    zs: zs.subarray(0, landCount),
    count: landCount,
  };
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
    const dist = spread * (0.5 + Math.random() * 0.48);
    stars.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      r: 0.3 + Math.random() * 1.15,
      alpha: 0.14 + Math.random() * 0.5,
      twinkleSpeed: 1.1 + Math.random() * 2.2,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function resolvePointCount(size: number, lite: boolean): number {
  if (lite) return Math.round(Math.min(520, Math.max(320, size * 2.2)));
  return Math.round(Math.min(5200, Math.max(2000, size * 3.8)));
}

function resolveDpr(lite: boolean): number {
  const raw = window.devicePixelRatio || 1;
  return lite ? Math.min(raw, 1.15) : Math.min(raw, 1.5);
}

type Quality = "high" | "mid" | "low";

const clampNum = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

export function LoginGlobe({ className, size, lite = false }: LoginGlobeProps) {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const phiRef = useRef(0.15);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);
  const qualityRef = useRef<Quality>(lite ? "low" : "high");
  const slowFrameStreakRef = useRef(0);
  const bucketsRef = useRef(new Map<number, { path: Path2D; color: string; alpha: number }>());

  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springRotX = useSpring(rotX, { stiffness: 55, damping: 16, mass: 0.6 });
  const springRotY = useSpring(rotY, { stiffness: 55, damping: 16, mass: 0.6 });

  useEffect(() => {
    if (reduceMotion || lite) return;
    const onPointerMove = (e: PointerEvent) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 2;
      const dy = (e.clientY / window.innerHeight - 0.5) * 2;
      rotY.set(clampNum(-7, dx * 7, 7));
      rotX.set(clampNum(-7, -dy * 7, 7));
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [lite, reduceMotion, rotX, rotY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let destroyed = false;
    let frame = 0;
    let visible = document.visibilityState === "visible";
    let points: LandPoints | null = null;
    const sampleCount = resolvePointCount(size, lite);
    const dpr = resolveDpr(lite);

    const canvasSize = Math.round(size * CANVAS_MARGIN_SCALE);
    canvas.width = Math.round(canvasSize * dpr);
    canvas.height = Math.round(canvasSize * dpr);
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    canvas.style.left = `${(size - canvasSize) / 2}px`;
    canvas.style.top = `${(size - canvasSize) / 2}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const R = size / 2 - 1;
    const CX = canvasSize / 2;
    const CY = canvasSize / 2;
    const baseDotR = Math.max(1.05, size / 310);
    const SAFE_R = R * 1.35;
    const stars = lite ? [] : buildStars(Math.round(size / 9), canvasSize * 0.48);
    const arcCount = lite ? 4 : CITIES.length;
    const arcs = ARCS_3D.slice(0, arcCount);
    /** Hubga bog'liq bo'lmagan mesh yo'nalishlar — hub orqaga aylanganda ham
     * ekranda doim harakatlanuvchi chiziqlar qolishi uchun. */
    const meshArcs = lite ? [] : MESH_ARCS_3D;

    const project = (x: number, y: number, z: number, cosPhi: number, sinPhi: number) => {
      const x1 = x * cosPhi + z * sinPhi;
      const z1 = -x * sinPhi + z * cosPhi;
      const y2 = y * COS_THETA - z1 * SIN_THETA;
      const z2 = y * SIN_THETA + z1 * COS_THETA;
      return { x1, y2, z2 };
    };

    const drawStars = (t: number) => {
      if (qualityRef.current === "low") return;
      for (const star of stars) {
        const dist = Math.hypot(star.x, star.y);
        const edgeFade = dist > R * 0.95 ? Math.max(0, 1 - (dist - R * 0.95) / (R * 0.55)) : 1;
        if (edgeFade < 0.04) continue;
        const twinkle = 0.55 + 0.45 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        ctx.globalAlpha = star.alpha * twinkle * edgeFade;
        ctx.fillStyle = "rgba(210,235,255,0.9)";
        ctx.beginPath();
        ctx.arc(CX + star.x, CY + star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    /** Atmosfera — soft radial glow, qattiq disk emas; pulse bilan jonli */
    const drawAtmosphere = (t: number) => {
      const pulse = 0.85 + 0.15 * Math.sin(t * 0.7);
      const atm = ctx.createRadialGradient(CX, CY, R * 0.68, CX, CY, R * (1.22 + 0.04 * pulse));
      atm.addColorStop(0, "rgba(56,189,248,0)");
      atm.addColorStop(0.5, `rgba(56,189,248,${0.03 * pulse})`);
      atm.addColorStop(0.72, `rgba(99,102,241,${0.09 * pulse})`);
      atm.addColorStop(0.88, `rgba(34,211,238,${0.06 * pulse})`);
      atm.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(CX, CY, R * 1.26, 0, Math.PI * 2);
      ctx.fill();
    };

    /** Globus ichki volume — quyuq, jismoniy shar hissi; faqat chekkada eriydi */
    const drawSphereVolume = () => {
      const core = ctx.createRadialGradient(
        CX - R * 0.3,
        CY - R * 0.34,
        R * 0.02,
        CX,
        CY,
        R,
      );
      core.addColorStop(0, "rgba(103,232,249,0.32)");
      core.addColorStop(0.16, "rgba(56,189,248,0.42)");
      core.addColorStop(0.36, "rgba(22,55,110,0.82)");
      core.addColorStop(0.58, "rgba(6,16,38,0.92)");
      core.addColorStop(0.78, "rgba(3,10,28,0.8)");
      core.addColorStop(0.92, "rgba(2,6,23,0.42)");
      core.addColorStop(1, "rgba(2,6,23,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fill();

      // Terminator soyasi — quyosh nurisiz tomonda chuqurlik hissi
      const shade = ctx.createRadialGradient(
        CX + R * 0.42,
        CY + R * 0.46,
        R * 0.05,
        CX + R * 0.15,
        CY + R * 0.2,
        R * 0.95,
      );
      shade.addColorStop(0, "rgba(0,0,0,0.42)");
      shade.addColorStop(0.6, "rgba(0,0,0,0.16)");
      shade.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fill();
    };

    /** Hub pulse ring — Toshkent markazi atrofida nafas oluvchi halqa */
    const drawHubPulse = (cosPhi: number, sinPhi: number, t: number) => {
      const { x1, y2, z2 } = project(HUB_VEC.x, HUB_VEC.y, HUB_VEC.z, cosPhi, sinPhi);
      if (z2 <= 0.05) return;
      const sx = CX + x1 * R;
      const sy = CY - y2 * R;
      const pulse = (t * 0.85) % 1;
      const ringR = Math.max(4, size / 90) * (1 + pulse * 2.2);
      ctx.beginPath();
      ctx.arc(sx, sy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125,249,255,${0.55 * (1 - pulse)})`;
      ctx.lineWidth = Math.max(1, size / 400);
      ctx.stroke();
      const pulse2 = ((t * 0.85) + 0.45) % 1;
      const ringR2 = Math.max(4, size / 90) * (1 + pulse2 * 2.2);
      ctx.beginPath();
      ctx.arc(sx, sy, ringR2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125,249,255,${0.35 * (1 - pulse2)})`;
      ctx.lineWidth = Math.max(0.8, size / 480);
      ctx.stroke();
    };

    const drawArcLine = (arc: Arc3D, cosPhi: number, sinPhi: number, color: string, width: number, alpha: number) => {
      let started = false;
      ctx.beginPath();
      for (let i = 0; i < arc.xs.length; i++) {
        const { x1, y2, z2 } = project(arc.xs[i], arc.ys[i], arc.zs[i], cosPhi, sinPhi);
        if (z2 <= 0.03) {
          started = false;
          continue;
        }
        let sx = CX + x1 * R;
        let sy = CY - y2 * R;
        const dx = sx - CX;
        const dy = sy - CY;
        const dist = Math.hypot(dx, dy);
        if (dist > SAFE_R) {
          const scale = SAFE_R / dist;
          sx = CX + dx * scale;
          sy = CY + dy * scale;
        }
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      if (!started) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.globalAlpha = alpha;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const drawArcTraveler = (
      arc: Arc3D,
      cosPhi: number,
      sinPhi: number,
      phase: number,
      color: string,
    ) => {
      const head = phase % 1;
      /** Uzunroq, silliq so'nadigan quyruq — "uchib borayotgan" taassurot beradi */
      const tail = 0.34;
      const headIdx = Math.round(head * ARC_STEPS);
      const tailSteps = Math.max(3, Math.round(tail * ARC_STEPS));

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = Math.max(0, headIdx - tailSteps); i < headIdx; i++) {
        const u0 = i / ARC_STEPS;
        const u1 = (i + 1) / ARC_STEPS;
        const p0 = project(arc.xs[i], arc.ys[i], arc.zs[i], cosPhi, sinPhi);
        const p1 = project(arc.xs[i + 1], arc.ys[i + 1], arc.zs[i + 1], cosPhi, sinPhi);
        if (p0.z2 <= 0.03 || p1.z2 <= 0.03) continue;

        let sx0 = CX + p0.x1 * R;
        let sy0 = CY - p0.y2 * R;
        let sx1 = CX + p1.x1 * R;
        let sy1 = CY - p1.y2 * R;
        const d0 = Math.hypot(sx0 - CX, sy0 - CY);
        if (d0 > SAFE_R) {
          const scale = SAFE_R / d0;
          sx0 = CX + (sx0 - CX) * scale;
          sy0 = CY + (sy0 - CY) * scale;
        }
        const d1 = Math.hypot(sx1 - CX, sy1 - CY);
        if (d1 > SAFE_R) {
          const scale = SAFE_R / d1;
          sx1 = CX + (sx1 - CX) * scale;
          sy1 = CY + (sy1 - CY) * scale;
        }

        const localMid = head - (u0 + u1) / 2;
        if (localMid < 0 || localMid > tail) continue;
        // Silliq ease-out so'nish — bosh yorqin, quyruq yumshoq erib boradi
        const fadeT = 1 - localMid / tail;
        const intensity = fadeT * fadeT * (3 - 2 * fadeT);
        if (intensity < 0.04) continue;

        ctx.globalAlpha = intensity * (qualityRef.current === "high" ? 0.9 : 0.68);
        ctx.lineWidth = Math.max(1.5, size / 240) * (0.55 + 0.45 * intensity);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
        ctx.stroke();
      }

      const { x1, y2, z2 } = project(arc.xs[headIdx], arc.ys[headIdx], arc.zs[headIdx], cosPhi, sinPhi);
      if (z2 > 0.05) {
        const hx = CX + x1 * R;
        const hy = CY - y2 * R;
        const hr = Math.max(2.4, size / 165);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(hx, hy, hr * 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(hx, hy, hr * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawMarker = (v: Vec3, cosPhi: number, sinPhi: number, radius: number, color: string) => {
      const { x1, y2, z2 } = project(v.x, v.y, v.z, cosPhi, sinPhi);
      if (z2 <= 0.03) return;
      const sx = CX + x1 * R;
      const sy = CY - y2 * R;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    };

    const updateQuality = (delta: number) => {
      if (lite || reduceMotion) {
        qualityRef.current = "low";
        return;
      }
      const ms = delta * 1000;
      if (ms > 17) slowFrameStreakRef.current += 1;
      else slowFrameStreakRef.current = Math.max(0, slowFrameStreakRef.current - 1);

      if (slowFrameStreakRef.current >= 5) qualityRef.current = "low";
      else if (slowFrameStreakRef.current >= 2) qualityRef.current = "mid";
      else qualityRef.current = "high";
    };

    const render = (timestamp: number) => {
      if (destroyed) return;
      frame = requestAnimationFrame(render);
      if (!visible || !points) return;

      const delta = lastFrameRef.current ? (timestamp - lastFrameRef.current) / 1000 : 0;
      lastFrameRef.current = timestamp;
      updateQuality(delta);

      if (!reduceMotion) {
        timeRef.current = timestamp * 0.001;
        if (pointerInteracting.current === null) {
          const speed = lite ? ROTATION_SPEED * 0.4 : ROTATION_SPEED;
          phiRef.current += speed * delta;
        }
      }

      const phi = phiRef.current + pointerMovement.current / 200;
      const t = timeRef.current;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const quality = qualityRef.current;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      if (!reduceMotion) drawStars(t);
      drawAtmosphere(t);
      drawSphereVolume();

      const { xs, ys, zs, count } = points;
      const ALPHA_LEVELS = 7;
      const buckets = bucketsRef.current;
      buckets.clear();

      for (let i = 0; i < count; i++) {
        const x = xs[i];
        const y = ys[i];
        const z = zs[i];

        const x1 = x * cosPhi + z * sinPhi;
        const z1 = -x * sinPhi + z * cosPhi;
        const y2 = y * COS_THETA - z1 * SIN_THETA;
        const z2 = y * SIN_THETA + z1 * COS_THETA;
        if (z2 <= 0.02) continue;

        const diffuse = Math.max(0, x1 * LIGHT.x + y2 * LIGHT.y + z2 * LIGHT.z);
        const intensity = 0.32 + 0.68 * Math.pow(diffuse, 0.72);
        const depthScale = 0.72 + 0.28 * z2;
        const edgeFade = Math.min(1, z2 / 0.16);

        const sx = CX + x1 * R;
        const sy = CY - y2 * R;
        const r = baseDotR * depthScale;
        const shadeIdx = Math.min(DOT_SHADES.length - 1, Math.round(intensity * (DOT_SHADES.length - 1)));
        const alphaBucket = Math.max(1, Math.round(edgeFade * ALPHA_LEVELS));

        const key = shadeIdx * ALPHA_LEVELS + alphaBucket;
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

      const arcWidth = Math.max(1.1, size / 340);
      const arcColor = "rgba(125,211,252,0.5)";
      const travelerColor = "rgba(224,242,254,0.95)";
      const meshColor = "rgba(129,140,248,0.42)";
      const meshTravelerColor = "rgba(199,210,254,0.9)";
      const showTravelers = !reduceMotion && quality !== "low";

      arcs.forEach((arc, idx) => {
        drawArcLine(arc, cosPhi, sinPhi, arcColor, arcWidth, quality === "high" ? 0.52 : 0.38);
        if (showTravelers) {
          const phase = (t * 0.4 + idx * 0.17) % 1;
          drawArcTraveler(arc, cosPhi, sinPhi, phase, travelerColor);
          // Ikkinchi traveler — qarama-qarshi fazada, chiziq uzunroq va jonli
          if (quality === "high" && idx % 2 === 0) {
            const phase2 = (t * 0.28 + idx * 0.23 + 0.5) % 1;
            drawArcTraveler(arc, cosPhi, sinPhi, phase2, "rgba(165,243,252,0.75)");
          }
        }
      });

      meshArcs.forEach((arc, idx) => {
        drawArcLine(arc, cosPhi, sinPhi, meshColor, arcWidth * 0.85, quality === "high" ? 0.4 : 0.28);
        if (showTravelers && quality !== "mid") {
          const phase = (t * 0.32 + idx * 0.21 + 0.13) % 1;
          drawArcTraveler(arc, cosPhi, sinPhi, phase, meshTravelerColor);
        }
      });

      if (!lite && quality !== "low") {
        for (let i = 0; i < arcCount; i++) {
          drawMarker(CITIES[i].pos, cosPhi, sinPhi, Math.max(1.35, size / 230), "#7dd3fc");
        }
      }
      if (!reduceMotion && quality !== "low") {
        drawHubPulse(cosPhi, sinPhi, t);
      }
      drawMarker(HUB_VEC, cosPhi, sinPhi, Math.max(2.1, size / 145), HUB.color);

      // Soft edge dissolve — kvadrat chekka umuman chizilmaydi, faqat
      // shar radiusidan tashqarida (star-field zonasida) yumshoq so'nadi
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      const edge = ctx.createRadialGradient(CX, CY, R * 0.86, CX, CY, R * 1.32);
      edge.addColorStop(0, "rgba(0,0,0,1)");
      edge.addColorStop(0.62, "rgba(0,0,0,1)");
      edge.addColorStop(0.8, "rgba(0,0,0,0.5)");
      edge.addColorStop(0.94, "rgba(0,0,0,0.1)");
      edge.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      ctx.restore();

      pointerMovement.current *= 0.94;
      if (Math.abs(pointerMovement.current) < 0.05) pointerMovement.current = 0;
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) lastFrameRef.current = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    loadLandMask()
      .then((mask) => {
        if (destroyed) return;
        points = buildLandPoints(sampleCount, mask);
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
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [size, reduceMotion, lite]);

  const canvasSize = size * CANVAS_MARGIN_SCALE;
  const canvasOffset = (size - canvasSize) / 2;

  return (
    <motion.div
      className={`relative mx-auto ${className ?? ""}`}
      style={{ width: size, height: size, perspective: 1200 }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{
        opacity: ready ? 1 : reduceMotion ? 1 : 0,
        scale: ready || reduceMotion ? 1 : 0.92,
      }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {!lite && (
        <>
          <div
            className="pointer-events-none absolute -inset-[40%] rounded-full login-globe-halo"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-[14%] rounded-full login-globe-orbit"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-[14%] rounded-full login-globe-orbit login-globe-orbit--reverse"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-[8%] rounded-full login-globe-orbit login-globe-orbit--slow"
            aria-hidden
          />
        </>
      )}

      <motion.div
        className="absolute inset-0"
        style={
          lite
            ? undefined
            : {
                rotateX: springRotX,
                rotateY: springRotY,
                transformStyle: "preserve-3d",
              }
        }
        animate={reduceMotion || lite ? undefined : { scale: [1, 1.012, 1] }}
        transition={
          reduceMotion || lite
            ? undefined
            : { duration: 8, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {/* Faqat canvas — DOM disk/fon yo'q; chekka faqat JS destination-in
            orqali eritiladi (bitta koordinata tizimi, mask ziddiyatisiz) */}
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

        {!lite && (
          <div
            className="pointer-events-none absolute inset-0 login-globe-shimmer"
            style={{
              background:
                "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.16) 0%, rgba(186,230,253,0.05) 14%, transparent 32%)",
              WebkitMaskImage:
                "radial-gradient(circle, #000 0%, #000 45%, transparent 78%)",
              maskImage:
                "radial-gradient(circle, #000 0%, #000 45%, transparent 78%)",
            }}
            aria-hidden
          />
        )}
      </motion.div>
    </motion.div>
  );
}
