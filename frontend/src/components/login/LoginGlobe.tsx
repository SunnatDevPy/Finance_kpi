import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/**
 * Login sahifasidagi premium 3D globus — Canvas 2D asosida.
 * Performance: faqat quruqlik nuqtalari, oldindan hisoblangan yoylar,
 * shadowBlur minimallashtirilgan, FPS bo'yicha adaptiv sifat.
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
];

const LIGHT = normalize({ x: -0.4, y: 0.45, z: 1 });
const CANVAS_MARGIN_SCALE = 1.55;
const ARC_LIFT = 0.3;
const ROTATION_SPEED = 0.28;
const ARC_STEPS = 24;
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

const SHADE_STEPS = 12;
const DOT_SHADES = Array.from({ length: SHADE_STEPS }, (_, i) => {
  const t = i / (SHADE_STEPS - 1);
  const r = Math.round(120 + 135 * Math.pow(t, 0.9));
  const g = Math.round(190 + 65 * Math.pow(t, 0.95));
  const b = Math.round(230 + 25 * t);
  return `${r},${g},${b}`;
});

/** Yoy geometriyasi — slerp + lift bir marta hisoblanadi */
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

/** Faqat quruqlik nuqtalari — render loopda filtrlash yo'q */
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
    const dist = spread * (0.55 + Math.random() * 0.45);
    stars.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      r: 0.4 + Math.random() * 1.1,
      alpha: 0.15 + Math.random() * 0.45,
      twinkleSpeed: 0.8 + Math.random() * 1.8,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function resolvePointCount(size: number, lite: boolean): number {
  if (lite) return Math.round(Math.min(520, Math.max(320, size * 2.2)));
  return Math.round(Math.min(4800, Math.max(1800, size * 3.6)));
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

    const R = size / 2 - 2;
    const CX = canvasSize / 2;
    const CY = canvasSize / 2;
    const baseDotR = Math.max(1.1, size / 300);
    const SAFE_R = R * 1.32;
    const stars = lite ? [] : buildStars(Math.round(size / 12), canvasSize * 0.46);
    const arcCount = lite ? 4 : CITIES.length;
    const arcs = ARCS_3D.slice(0, arcCount);

    const project = (x: number, y: number, z: number, cosPhi: number, sinPhi: number) => {
      const x1 = x * cosPhi + z * sinPhi;
      const z1 = -x * sinPhi + z * cosPhi;
      const y2 = y * COS_THETA - z1 * SIN_THETA;
      const z2 = y * SIN_THETA + z1 * COS_THETA;
      return { x1, y2, z2 };
    };

    const drawStars = (t: number) => {
      if (qualityRef.current === "low") return;
      ctx.fillStyle = "rgba(200,230,255,0.35)";
      for (const star of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        const a = star.alpha * twinkle;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(CX + star.x, CY + star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
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
      const tail = 0.16;
      const headIdx = Math.round(head * ARC_STEPS);
      const tailSteps = Math.max(2, Math.round(tail * ARC_STEPS));

      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = color;

      let started = false;
      ctx.beginPath();
      for (let i = Math.max(0, headIdx - tailSteps); i <= headIdx; i++) {
        const u = i / ARC_STEPS;
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
        const local = head - u;
        const intensity = local >= 0 && local <= tail ? 1 - local / tail : 0;
        if (intensity < 0.05) continue;

        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      if (started) {
        ctx.globalAlpha = qualityRef.current === "high" ? 0.85 : 0.65;
        ctx.lineWidth = Math.max(1.1, size / 320);
        ctx.stroke();
      }

      const { x1, y2, z2 } = project(arc.xs[headIdx], arc.ys[headIdx], arc.zs[headIdx], cosPhi, sinPhi);
      if (z2 > 0.05) {
        const hx = CX + x1 * R;
        const hy = CY - y2 * R;
        const hr = Math.max(1.6, size / 240);
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(hx, hy, hr * 0.4, 0, Math.PI * 2);
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

      const { xs, ys, zs, count } = points;
      const ALPHA_LEVELS = 6;
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
        const intensity = 0.35 + 0.65 * Math.pow(diffuse, 0.75);
        const depthScale = 0.75 + 0.25 * z2;
        const edgeFade = Math.min(1, z2 / 0.14);

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

      const arcWidth = Math.max(0.8, size / 460);
      const arcColor = "rgba(96,165,250,0.55)";
      const travelerColor = "rgba(186,230,253,0.9)";
      const showTravelers = !reduceMotion && quality !== "low";

      arcs.forEach((arc, idx) => {
        drawArcLine(arc, cosPhi, sinPhi, arcColor, arcWidth, quality === "high" ? 0.5 : 0.38);
        if (showTravelers) {
          const phase = (t * 0.42 + idx * 0.17) % 1;
          drawArcTraveler(arc, cosPhi, sinPhi, phase, travelerColor);
        }
      });

      if (!lite && quality !== "low") {
        for (let i = 0; i < arcCount; i++) {
          drawMarker(CITIES[i].pos, cosPhi, sinPhi, Math.max(1.4, size / 220), "#7dd3fc");
        }
      }
      drawMarker(HUB_VEC, cosPhi, sinPhi, Math.max(2.2, size / 140), HUB.color);

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
      style={{ width: size, height: size, perspective: 1200, contain: "layout style paint" }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: ready ? 1 : reduceMotion ? 1 : 0, scale: ready || reduceMotion ? 1 : 0.94 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {!lite && (
        <>
          <div
            className="pointer-events-none absolute -inset-[14%] rounded-full login-globe-halo"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-[9%] rounded-full login-globe-orbit"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-[9%] rounded-full login-globe-orbit login-globe-orbit--reverse"
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
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, rgba(103,232,249,0.16) 0%, rgba(56,189,248,0.08) 22%, rgba(15,23,42,0.97) 46%, rgba(2,6,23,0.99) 80%)",
            boxShadow:
              "inset 0 0 48px rgba(0,0,0,0.55), inset 0 0 2px rgba(255,255,255,0.08), 0 0 72px rgba(56,189,248,0.16), 0 0 120px rgba(99,102,241,0.1)",
          }}
        />

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

        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          {!lite && (
            <div
              className="absolute inset-0 login-globe-shimmer"
              style={{
                background:
                  "radial-gradient(circle at 24% 18%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 14%, transparent 34%)",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 52%, rgba(0,0,0,0.35) 82%, rgba(0,0,0,0.62) 100%)",
            }}
          />
          <div className="absolute inset-0 login-globe-rim" />
        </div>
      </motion.div>
    </motion.div>
  );
}
