import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Car, MapPin, PackageCheck, Warehouse, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { ESTADO_COLORS } from "@/lib/constants";

function KpiCard({ label, value, icon: Icon, accent, testid, onClick }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="text-left group rounded-2xl bg-white border border-border p-6 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="h-11 w-11 rounded-xl grid place-items-center" style={{ background: `${accent}14` }}>
          <Icon className="h-5 w-5" strokeWidth={1.75} style={{ color: accent }} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-bmw-soft/30 group-hover:text-bmw-blue transition-colors" />
      </div>
      <p className="font-display text-4xl font-light mt-5 tabular-nums">{value}</p>
      <p className="text-sm text-bmw-soft/70 mt-1">{label}</p>
    </button>
  );
}

function BreakdownCard({ title, data, testid }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="rounded-2xl bg-white border border-border p-6 shadow-soft" data-testid={testid}>
      <h3 className="font-display text-lg mb-5">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-bmw-soft/50">Sin datos todavía.</p>
      ) : (
        <div className="space-y-4">
          {entries.map(([label, value]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-bmw-soft">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-bmw-surface overflow-hidden">
                <div className="h-full rounded-full bg-bmw-blue transition-all duration-500"
                     style={{ width: `${(value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await api.get("/vehicles/stats")).data,
  });

  const s = data || { total: 0, por_ubicacion: {}, por_estado: {}, por_categoria: {}, recientes: [] };
  const exposicion = s.por_ubicacion?.["Exposición"] || 0;
  const entregas = s.por_ubicacion?.["Entrega"] || 0;
  const stock = s.por_ubicacion?.["Stock"] || 0;

  return (
    <div className="max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-bmw-blue">Panel</p>
      <h1 className="font-display text-3xl sm:text-4xl font-light mt-2">Buenos días</h1>
      <p className="text-bmw-soft/70 mt-1">Resumen general de la exposición y el stock del concesionario.</p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/60 border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-8">
            <KpiCard label="Vehículos totales" value={s.total} icon={Car} accent="#0066B1"
                     testid="kpi-total" onClick={() => navigate("/stock")} />
            <KpiCard label="En exposición" value={exposicion} icon={MapPin} accent="#5BC2E7"
                     testid="kpi-exposicion" onClick={() => navigate("/stock")} />
            <KpiCard label="En stock" value={stock} icon={Warehouse} accent="#003DA5"
                     testid="kpi-stock" onClick={() => navigate("/stock")} />
            <KpiCard label="Para entrega" value={entregas} icon={PackageCheck} accent="#E7222E"
                     testid="kpi-entregas" onClick={() => navigate("/stock")} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mt-5">
            <BreakdownCard title="Por estado" data={s.por_estado} testid="breakdown-estado" />
            <BreakdownCard title="Por categoría" data={s.por_categoria} testid="breakdown-categoria" />
          </div>

          <div className="rounded-2xl bg-white border border-border p-6 shadow-soft mt-5" data-testid="recent-vehicles">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg">Últimos vehículos</h3>
              <button onClick={() => navigate("/stock")} className="text-sm text-bmw-blue font-medium hover:text-bmw-dark transition-colors">
                Ver stock
              </button>
            </div>
            {s.recientes?.length === 0 ? (
              <p className="text-sm text-bmw-soft/50">Aún no hay vehículos. Añade el primero desde el módulo Stock.</p>
            ) : (
              <div className="divide-y divide-border">
                {s.recientes.map((v) => {
                  const est = ESTADO_COLORS[v.estado] || ESTADO_COLORS.Disponible;
                  return (
                    <div key={v.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{v.modelo || "—"} {v.acabado}</p>
                        <p className="text-xs text-bmw-soft/60 truncate">{v.motor} · {v.matricula || v.vin_corto || "sin matrícula"}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: est.bg, color: est.text }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: est.dot }} />
                        {v.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
