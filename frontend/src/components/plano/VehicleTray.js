import { Car } from "lucide-react";
import CarSilhouette from "./CarSilhouette";
import { BMW_COLORS, ESTADO_COLORS } from "@/lib/constants";

const colorHex = (name) => BMW_COLORS.find((c) => c.name === name)?.hex || "#8A8D91";

export default function VehicleTray({ vehicles, onOpenVehicle }) {
  return (
    <div
      data-tray="1"
      className="rounded-2xl bg-white border border-border shadow-soft flex flex-col overflow-hidden h-full"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-bmw-blue" strokeWidth={1.75} />
          <span className="font-display text-sm font-medium">Sin plaza</span>
        </div>
        <span className="text-xs font-semibold text-bmw-soft/60">{vehicles.length}</span>
      </div>

      <div className="flex-1 overflow-auto bmw-scroll p-3 flex lg:flex-col gap-3">
        {vehicles.length === 0 ? (
          <p className="text-xs text-bmw-soft/50 p-2">Todos los vehículos están colocados.</p>
        ) : (
          vehicles.map((v) => (
            <div
              key={v.id}
              data-vehicle-id={v.id}
              data-tray-item="1"
              className="shrink-0 w-36 lg:w-full rounded-xl border border-border bg-white hover:shadow-card transition-shadow cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="flex items-center gap-2 p-2">
                <span className="h-8 w-8 shrink-0 rounded-full border border-black/10" style={{ background: colorHex(v.color) }} />
                <div className="min-w-0">
                  <p className="font-display font-semibold text-xs truncate">{v.modelo || "—"}</p>
                  <p className="text-[10px] text-bmw-soft/60 truncate">{v.motor} · {v.vin_corto || "—"}</p>
                </div>
              </div>
              <div className="h-16 grid place-items-center px-2 pb-2">
                <CarSilhouette category={v.categoria} hex={colorHex(v.color)} className="h-full w-auto" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
