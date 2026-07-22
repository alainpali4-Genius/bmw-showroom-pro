import { memo } from "react";
import { Phone, User, Calendar, Clock, StickyNote } from "lucide-react";
import CarSilhouette from "@/components/plano/CarSilhouette";
import { BMW_COLORS, ESTADOS_ENTREGA } from "@/lib/constants";

const colorHex = (name) => BMW_COLORS.find((c) => c.name === name)?.hex || "#8A8D91";

function EntregaCard({ item, dragging }) {
  const hex = colorHex(item.color);
  const est = ESTADOS_ENTREGA.find((e) => e.name === item.estado_preparacion) || ESTADOS_ENTREGA[0];

  return (
    <div
      data-entrega-id={item.id}
      className={`rounded-2xl bg-white border border-border shadow-soft hover:shadow-card transition-shadow cursor-grab active:cursor-grabbing touch-none select-none ${dragging ? "opacity-90 rotate-1" : ""}`}
      style={{ borderTop: `3px solid ${est.color}` }}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm leading-tight truncate">
              {item.marca} {item.modelo} <span className="text-bmw-soft/60 font-normal">{item.acabado}</span>
            </p>
            <p className="text-xs text-bmw-soft/70 truncate">{item.motor}</p>
          </div>
          <div className="h-12 w-9 shrink-0 grid place-items-center">
            <CarSilhouette category={item.categoria} hex={hex} className="h-full w-auto" />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: hex }} />
            <span className="text-bmw-soft/80">{item.color || "—"}</span>
          </span>
          <span className="font-mono text-bmw-soft/70">· {item.vin_corto || "—"}</span>
          {item.matricula && <span className="text-bmw-soft/70">· {item.matricula}</span>}
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs">
          <p className="flex items-center gap-2 text-bmw-soft"><User className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{item.cliente || "Sin cliente"}</span></p>
          {item.telefono && <p className="flex items-center gap-2 text-bmw-soft"><Phone className="h-3.5 w-3.5 shrink-0" /> {item.telefono}</p>}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-bmw-soft"><Calendar className="h-3.5 w-3.5" /> {item.fecha_entrega || "—"}</span>
            <span className="flex items-center gap-1.5 text-bmw-soft"><Clock className="h-3.5 w-3.5" /> {item.hora_entrega || "—"}</span>
          </div>
          {item.comercial && <p className="text-[11px] text-bmw-soft/60">Comercial: {item.comercial}</p>}
          {item.observaciones && (
            <p className="flex items-start gap-2 text-bmw-soft/70"><StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" /> <span className="line-clamp-2">{item.observaciones}</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(EntregaCard);
