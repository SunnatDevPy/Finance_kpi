import { formatChartBarValue } from "../utils/format";

export interface Bar3DProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: unknown;
  isRevenue?: boolean;
}

/** SVG Gradients & drop-shadow filters for 3D Bars */
export function Bar3DDefs() {
  return (
    <defs>
      {/* 3D Revenue (Green) Gradients */}
      <linearGradient id="bar3d-rev-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="bar3d-rev-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6ee7b7" />
        <stop offset="100%" stopColor="#34d399" />
      </linearGradient>

      {/* 3D Expense (Red) Gradients */}
      <linearGradient id="bar3d-exp-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="50%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#be123c" />
      </linearGradient>
      <linearGradient id="bar3d-exp-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fda4af" />
        <stop offset="100%" stopColor="#fb7185" />
      </linearGradient>

      {/* Soft shadow filter for realistic 3D depth */}
      <filter id="bar3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.22" />
      </filter>
    </defs>
  );
}

/** 3D Bar Shape for Recharts */
export function Bar3DShape(props: Bar3DProps) {
  const { x = 0, y = 0, width = 0, height = 0, value, isRevenue = false } = props;

  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  if (!Number.isFinite(num) || num <= 0 || height <= 0 || width <= 0) {
    return null;
  }

  // Calculate 3D isometric projection offsets based on bar width
  const dx = Math.max(3, Math.min(Math.round(width * 0.28), 8));
  const dy = Math.max(2, Math.min(Math.round(dx * 0.75), 6));

  const frontFill = isRevenue ? "url(#bar3d-rev-front)" : "url(#bar3d-exp-front)";
  const topFill = isRevenue ? "url(#bar3d-rev-top)" : "url(#bar3d-exp-top)";
  const topStroke = isRevenue ? "#34d399" : "#fb7185";
  const sideFill = isRevenue ? "#064e3b" : "#881337";
  const sideStroke = isRevenue ? "#047857" : "#9f1239";

  // Top face points (illuminated roof cap)
  const topPoints = `${x},${y} ${x + dx},${y - dy} ${x + width + dx},${y - dy} ${x + width},${y}`;

  // Right side face points (shadowed isometric side)
  const sidePoints = `${x + width},${y} ${x + width + dx},${y - dy} ${x + width + dx},${y + height - dy} ${x + width},${y + height}`;

  return (
    <g className="transition-all duration-200 hover:brightness-110" filter="url(#bar3d-shadow)">
      {/* Right side face (drawn first so front face can overlay cleanly) */}
      <polygon
        points={sidePoints}
        fill={sideFill}
        stroke={sideStroke}
        strokeWidth={0.5}
        strokeLinejoin="round"
      />

      {/* Front main face */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={frontFill}
        rx={1}
      />

      {/* Front left specular reflection edge */}
      <line
        x1={x + 1}
        y1={y}
        x2={x + 1}
        y2={y + height}
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth={1}
      />

      {/* Top face (top cap) */}
      <polygon
        points={topPoints}
        fill={topFill}
        stroke={topStroke}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Label positioned neatly above the 3D top cap with anti-collision vertical stagger */
export function Bar3DLabel(props: any) {
  const { x = 0, y = 0, width = 0, value, dataKey, payload } = props;
  const text = formatChartBarValue(value);
  if (!text) return null;

  const dx = Math.max(3, Math.min(Math.round(width * 0.28), 8));
  const dy = Math.max(2, Math.min(Math.round(dx * 0.75), 6));

  const isRev = dataKey === "total_revenue";
  const revVal = Number(payload?.total_revenue || 0);
  const expVal = Number(payload?.total_expense || 0);

  // Anti-collision logic: agar tushum va chiqim yaqin bo'lsa, tushumni 14px yuqoriroq suramiz
  let extraYOffset = 0;
  if (revVal > 0 && expVal > 0) {
    const maxVal = Math.max(revVal, expVal);
    const minVal = Math.min(revVal, expVal);
    if (minVal / maxVal >= 0.45) {
      extraYOffset = isRev ? -14 : 0;
    }
  }

  const centerX = x + width / 2 + dx / 2;
  const labelY = y - dy - 5 + extraYOffset;

  return (
    <text
      x={centerX}
      y={labelY}
      textAnchor="middle"
      fontSize={9.5}
      fontWeight={600}
      className="fill-foreground font-semibold"
      style={{ pointerEvents: "none" }}
    >
      {text}
    </text>
  );
}

/** 2D Bar Label with anti-collision vertical stagger */
export function Bar2DLabel(props: any) {
  const { x = 0, y = 0, width = 0, value, dataKey, payload } = props;
  const text = formatChartBarValue(value);
  if (!text) return null;

  const isRev = dataKey === "total_revenue";
  const revVal = Number(payload?.total_revenue || 0);
  const expVal = Number(payload?.total_expense || 0);

  let extraYOffset = 0;
  if (revVal > 0 && expVal > 0) {
    const maxVal = Math.max(revVal, expVal);
    const minVal = Math.min(revVal, expVal);
    if (minVal / maxVal >= 0.45) {
      extraYOffset = isRev ? -14 : 0;
    }
  }

  const centerX = x + width / 2;
  const labelY = y - 5 + extraYOffset;

  return (
    <text
      x={centerX}
      y={labelY}
      textAnchor="middle"
      fontSize={9.5}
      fontWeight={600}
      className="fill-foreground font-semibold"
      style={{ pointerEvents: "none" }}
    >
      {text}
    </text>
  );
}
