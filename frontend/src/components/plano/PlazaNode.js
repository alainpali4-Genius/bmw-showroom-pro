import { RotateCw, Maximize2 } from "lucide-react";
import { zoneColor } from "@/lib/constants";
import VehicleCard from "./VehicleCard";

export default function PlazaNode({ plaza, vehicle, mode, selected, dropTarget }) {
  const accent = zoneColor(plaza.zona);
  const occupied = Boolean(vehicle);
  const edit = mode === "edit";

  return (
    <div
      data-plaza-id={plaza.id}
      className="absolute touch-none"
      style={{
        left: plaza.x,
        top: plaza.y,
        width: plaza.w,
        height: plaza.h,
        transform: `rotate(${plaza.rotation || 0}deg)`,
        transformOrigin: "center center",
        zIndex: selected ? 20 : occupied ? 10 : 5,
      }}
    >
      <div
        className="relative h-full w-full rounded-2xl transition-shadow duration-150"
        style={{
          border: occupied ? `1.5px solid ${accent}` : `2px dashed ${accent}80`,
          background: occupied ? "#FFFFFF" : `${accent}0D`,
          boxShadow: dropTarget
            ? `0 0 0 3px ${accent}, 0 8px 30px rgb(0 0 0 / 0.12)`
            : selected
            ? `0 0 0 2px ${accent}`
            : occupied
            ? "0 6px 20px rgb(0 0 0 / 0.06)"
            : "none",
        }}
      >
        {/* Etiqueta de plaza */}
        <span
          className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm z-10"
          style={{ background: accent }}
        >
          {plaza.nombre}
        </span>

        {occupied ? (
          <div data-vehicle-id={vehicle.id} className="h-full w-full cursor-grab active:cursor-grabbing">
            <VehicleCard vehicle={vehicle} plazaNombre={plaza.nombre} />
          </div>
        ) : (
          <div className="h-full w-full grid place-items-center">
            <span className="font-display text-lg font-light" style={{ color: `${accent}99` }}>
              {plaza.nombre}
            </span>
          </div>
        )}

        {edit && selected && (
          <>
            <div
              data-handle="rotate"
              className="absolute left-1/2 -top-9 -translate-x-1/2 h-6 w-6 rounded-full bg-white border grid place-items-center cursor-grab shadow"
              style={{ borderColor: accent }}
            >
              <RotateCw className="h-3.5 w-3.5" style={{ color: accent }} />
            </div>
            <div
              data-handle="resize"
              className="absolute -right-2.5 -bottom-2.5 h-6 w-6 rounded-full bg-white border grid place-items-center cursor-se-resize shadow"
              style={{ borderColor: accent }}
            >
              <Maximize2 className="h-3.5 w-3.5" style={{ color: accent }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
