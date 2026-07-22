import CarSilhouette from "./CarSilhouette";
import { BMW_COLORS, ESTADO_COLORS } from "@/lib/constants";

const colorHex = (name) => BMW_COLORS.find((c) => c.name === name)?.hex || "#8A8D91";

export default function VehicleCard({ vehicle, plazaNombre }) {
  const hex = colorHex(vehicle.color);
  const est = ESTADO_COLORS[vehicle.estado] || ESTADO_COLORS.Disponible;

  return (
    <div className="h-full w-full flex flex-col p-2 gap-1 select-none">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-display font-semibold text-[11px] leading-tight truncate">
            {vehicle.modelo || "—"}
          </p>
          <p className="text-[9px] text-bmw-soft/70 leading-tight truncate">{vehicle.motor || ""}</p>
        </div>
        <span className="shrink-0 h-2.5 w-2.5 rounded-full mt-0.5" style={{ background: est.dot }} title={vehicle.estado} />
      </div>

      <div className="flex-1 min-h-0 grid place-items-center py-0.5">
        <CarSilhouette category={vehicle.categoria} hex={hex} className="h-full max-h-full w-auto" />
      </div>

      <div className="flex items-center justify-between gap-1 text-[9px] leading-none">
        <span className="font-mono text-bmw-soft/80 truncate">{vehicle.vin_corto || "—"}</span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <span className="h-2 w-2 rounded-full border border-black/10" style={{ background: hex }} />
          {plazaNombre && (
            <span className="px-1 py-0.5 rounded bg-bmw-surface text-bmw-soft font-semibold">{plazaNombre}</span>
          )}
        </span>
      </div>
    </div>
  );
}
