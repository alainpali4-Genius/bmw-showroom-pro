// Silueta superior premium del vehículo según carrocería, pintada con el color BMW real.

const CONFIG = {
  SUV: { len: 210, rx: 20, roof: [58, 152] },
  Berlina: { len: 220, rx: 30, roof: [70, 146] },
  Touring: { len: 228, rx: 26, roof: [70, 176] },
  Familiar: { len: 228, rx: 26, roof: [70, 176] },
  Compact: { len: 190, rx: 30, roof: [72, 138] },
  "Coupé": { len: 214, rx: 36, roof: [84, 132] },
  "Gran Coupé": { len: 224, rx: 32, roof: [80, 150] },
  Cabrio: { len: 210, rx: 34, roof: null },
  Roadster: { len: 188, rx: 40, roof: null },
  "Eléctrico": { len: 214, rx: 30, roof: [66, 150] },
};

function darken(hex, amt = 0.5) {
  const h = (hex || "#8A8D91").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * amt));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * amt));
  const b = Math.max(0, Math.round((n & 255) * amt));
  return `rgb(${r},${g},${b})`;
}

export default function CarSilhouette({ category, hex = "#8A8D91", className = "" }) {
  const cfg = CONFIG[category] || CONFIG.Berlina;
  const W = 120;
  const H = cfg.len;
  const bx = 12, bw = W - 24;
  const stroke = darken(hex, 0.55);
  const glass = "rgba(17,22,32,0.72)";
  const trim = "rgba(255,255,255,0.14)";
  const hasRoof = cfg.roof !== null;
  const [rt, rb] = cfg.roof || [0, 0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* Sombra */}
      <rect x={bx + 3} y={13} width={bw} height={H - 26} rx={cfg.rx} fill="rgba(0,0,0,0.12)" />
      {/* Carrocería */}
      <rect x={bx} y={10} width={bw} height={H - 20} rx={cfg.rx} fill={hex} stroke={stroke} strokeWidth="2" />
      {/* Reflejo lateral */}
      <rect x={bx + 4} y={16} width={bw - 8} height={H - 32} rx={cfg.rx - 4} fill="none" stroke={trim} strokeWidth="1.5" />
      {/* Retrovisores */}
      <rect x={bx - 6} y={hasRoof ? rt : H * 0.34} width="8" height="14" rx="3" fill={hex} stroke={stroke} strokeWidth="1.5" />
      <rect x={W - bx - 2} y={hasRoof ? rt : H * 0.34} width="8" height="14" rx="3" fill={hex} stroke={stroke} strokeWidth="1.5" />

      {hasRoof ? (
        <>
          {/* Parabrisas delantero */}
          <polygon points={`38,${rt} 82,${rt} 74,${rt - 20} 46,${rt - 20}`} fill={glass} />
          {/* Luneta trasera */}
          <polygon points={`40,${rb} 80,${rb} 74,${rb + 18} 46,${rb + 18}`} fill={glass} />
          {/* Techo */}
          <rect x="40" y={rt} width="40" height={rb - rt} rx="6" fill={darken(hex, 0.82)} stroke={stroke} strokeWidth="1" />
          {/* Ventanillas laterales */}
          <rect x="34" y={rt + 4} width="7" height={rb - rt - 8} rx="3" fill={glass} />
          <rect x={W - 41} y={rt + 4} width="7" height={rb - rt - 8} rx="3" fill={glass} />
        </>
      ) : (
        <>
          {/* Parabrisas descapotable */}
          <polygon points={`40,${H * 0.4} 80,${H * 0.4} 72,${H * 0.32} 48,${H * 0.32}`} fill={glass} />
          {/* Habitáculo abierto */}
          <rect x="34" y={H * 0.4} width={W - 68} height={H * 0.22} rx="10" fill={darken(hex, 0.35)} />
          <circle cx="48" cy={H * 0.5} r="7" fill={darken(hex, 0.2)} />
          <circle cx="72" cy={H * 0.5} r="7" fill={darken(hex, 0.2)} />
        </>
      )}

      {/* Faros / pilotos */}
      <rect x="20" y="14" width="14" height="6" rx="3" fill="rgba(255,255,255,0.55)" />
      <rect x={W - 34} y="14" width="14" height="6" rx="3" fill="rgba(255,255,255,0.55)" />
      <rect x="20" y={H - 20} width="14" height="6" rx="3" fill="rgba(231,34,46,0.75)" />
      <rect x={W - 34} y={H - 20} width="14" height="6" rx="3" fill="rgba(231,34,46,0.75)" />
    </svg>
  );
}
