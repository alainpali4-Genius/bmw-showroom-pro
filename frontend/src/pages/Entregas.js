import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, CalendarClock, Clock3, PackageCheck, CircleCheck, Truck } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { ESTADOS_ENTREGA } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import EntregaCard from "@/components/entregas/EntregaCard";
import EntregaEditDialog from "@/components/entregas/EntregaEditDialog";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Kpi({ label, value, icon: Icon, accent, testid }) {
  return (
    <div data-testid={testid} className="rounded-2xl bg-white border border-border p-4 sm:p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: `${accent}14` }}>
          <Icon className="h-5 w-5" strokeWidth={1.75} style={{ color: accent }} />
        </div>
      </div>
      <p className="font-display text-3xl font-light mt-3 tabular-nums">{value}</p>
      <p className="text-xs text-bmw-soft/70 mt-0.5">{label}</p>
    </div>
  );
}

export default function Entregas() {
  const qc = useQueryClient();
  const interaction = useRef(null);
  const [ghost, setGhost] = useState(null);
  const [dropCol, setDropCol] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ fecha: "", estado: "", modelo: "", comercial: "", cliente: "" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["entregas"],
    queryFn: async () => (await api.get("/entregas")).data,
    refetchInterval: 15000,
  });
  const itemsRef = useRef(items); itemsRef.current = items;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["entregas"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const comerciales = useMemo(
    () => [...new Set(items.map((i) => i.comercial).filter(Boolean))].sort(),
    [items]
  );

  const kpis = useMemo(() => {
    const t = todayStr();
    return {
      hoy: items.filter((i) => i.fecha_entrega === t).length,
      pendientes: items.filter((i) => i.estado_preparacion === "Pendiente").length,
      listas: items.filter((i) => i.estado_preparacion === "Listo para entregar").length,
      entregadas: items.filter((i) => i.estado_preparacion === "Entregado").length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (s) {
        const hay = [i.cliente, i.vin, i.matricula, i.modelo].some((f) => (f || "").toLowerCase().includes(s));
        if (!hay) return false;
      }
      if (filters.fecha && i.fecha_entrega !== filters.fecha) return false;
      if (filters.estado && i.estado_preparacion !== filters.estado) return false;
      if (filters.modelo && !(i.modelo || "").toLowerCase().includes(filters.modelo.toLowerCase())) return false;
      if (filters.comercial && i.comercial !== filters.comercial) return false;
      if (filters.cliente && !(i.cliente || "").toLowerCase().includes(filters.cliente.toLowerCase())) return false;
      return true;
    });
  }, [items, q, filters]);

  const columns = useMemo(
    () => ESTADOS_ENTREGA.map((e) => ({ ...e, cards: filtered.filter((i) => i.estado_preparacion === e.name) })),
    [filtered]
  );

  const moveTo = async (id, estado) => {
    const current = itemsRef.current.find((i) => i.id === id);
    if (!current || current.estado_preparacion === estado) return;
    // optimista
    qc.setQueryData(["entregas"], (old = []) => old.map((i) => (i.id === id ? { ...i, estado_preparacion: estado } : i)));
    try {
      await api.put(`/entregas/${id}`, { estado_preparacion: estado });
      refresh();
    } catch (e) {
      toast.error(apiError(e));
      refresh();
    }
  };

  // Drag & Drop por punteros
  const handleDown = (e) => {
    const card = e.target.closest?.("[data-entrega-id]");
    if (!card) return;
    const id = card.getAttribute("data-entrega-id");
    const item = itemsRef.current.find((i) => i.id === id);
    interaction.current = { id, item, startX: e.clientX, startY: e.clientY, moved: false };
    setGhost({ item, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const onMove = (e) => {
      const it = interaction.current;
      if (!it) return;
      if (Math.hypot(e.clientX - it.startX, e.clientY - it.startY) > 5) it.moved = true;
      setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const col = el?.closest?.("[data-col]");
      setDropCol(col ? col.getAttribute("data-col") : null);
    };
    const onUp = (e) => {
      const it = interaction.current;
      interaction.current = null;
      setGhost(null); setDropCol(null);
      if (!it) return;
      if (!it.moved) { setEditItem(it.item); return; }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const col = el?.closest?.("[data-col]");
      if (col) moveTo(it.id, col.getAttribute("data-col"));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const clearFilters = () => { setFilters({ fecha: "", estado: "", modelo: "", comercial: "", cliente: "" }); setQ(""); };
  const activeFilters = Object.values(filters).filter(Boolean).length + (q ? 1 : 0);

  return (
    <div className="max-w-none">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-bmw-blue">Logística</p>
        <h1 className="font-display text-3xl sm:text-4xl font-light mt-2">Entregas</h1>
        <p className="text-bmw-soft/70 mt-1">{items.length} vehículos en proceso de entrega</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Kpi label="Entregas de hoy" value={kpis.hoy} icon={CalendarClock} accent="#0066B1" testid="kpi-hoy" />
        <Kpi label="Pendientes" value={kpis.pendientes} icon={Clock3} accent="#B26A00" testid="kpi-pendientes" />
        <Kpi label="Listas" value={kpis.listas} icon={PackageCheck} accent="#1B8A4B" testid="kpi-listas" />
        <Kpi label="Entregadas" value={kpis.entregadas} icon={CircleCheck} accent="#2B2B2B" testid="kpi-entregadas" />
      </div>

      {/* Buscador + filtros */}
      <div className="mt-5 rounded-2xl bg-white border border-border shadow-soft p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bmw-soft/50" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, VIN, matrícula, modelo…"
                 className="pl-10 h-11 rounded-xl border-transparent bg-bmw-surface" data-testid="entregas-search-input" />
        </div>
        <Input type="date" value={filters.fecha} onChange={(e) => setFilters((f) => ({ ...f, fecha: e.target.value }))}
               className="w-auto h-11 rounded-xl" data-testid="filter-fecha" />
        <Select value={filters.estado || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, estado: v === "all" ? "" : v }))}>
          <SelectTrigger className="w-auto min-w-[130px] h-11 rounded-xl" data-testid="filter-estado"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS_ENTREGA.map((e) => <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={filters.modelo} onChange={(e) => setFilters((f) => ({ ...f, modelo: e.target.value }))}
               placeholder="Modelo" className="w-auto max-w-[130px] h-11 rounded-xl" data-testid="filter-modelo" />
        <Select value={filters.comercial || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, comercial: v === "all" ? "" : v }))}>
          <SelectTrigger className="w-auto min-w-[130px] h-11 rounded-xl" data-testid="filter-comercial"><SelectValue placeholder="Comercial" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los comerciales</SelectItem>
            {comerciales.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={filters.cliente} onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
               placeholder="Cliente" className="w-auto max-w-[130px] h-11 rounded-xl" data-testid="filter-cliente" />
        {activeFilters > 0 && (
          <Button variant="ghost" className="rounded-xl h-11 text-bmw-red" onClick={clearFilters} data-testid="clear-filters">Limpiar</Button>
        )}
      </div>

      {/* Tablero */}
      {isLoading ? (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-white/60 border border-border animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-border bg-white p-12 text-center shadow-soft" data-testid="entregas-empty">
          <div className="h-14 w-14 rounded-2xl bg-bmw-surface grid place-items-center mx-auto">
            <Truck className="h-6 w-6 text-bmw-blue" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-xl mt-5">No hay entregas</h3>
          <p className="text-bmw-soft/70 mt-1">Cambia la ubicación de un vehículo a «Entrega» en Stock para que aparezca aquí automáticamente.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" onPointerDown={handleDown}>
          {columns.map((col) => (
            <div
              key={col.name}
              data-col={col.name}
              data-testid={`column-${col.name}`}
              className="rounded-2xl bg-bmw-surface/60 border border-border p-3 min-h-[200px] transition-colors"
              style={dropCol === col.name ? { background: `${col.color}12`, borderColor: col.color } : undefined}
            >
              <div className="flex items-center justify-between px-1.5 pb-3 sticky top-0">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="font-display text-sm font-semibold">{col.name}</span>
                </div>
                <span className="text-xs font-semibold text-bmw-soft/60 tabular-nums">{col.cards.length}</span>
              </div>
              <div className="space-y-3">
                {col.cards.map((item) => <EntregaCard key={item.id} item={item} dragging={ghost?.item?.id === item.id} />)}
                {col.cards.length === 0 && (
                  <p className="text-xs text-bmw-soft/40 text-center py-8">Arrastra tarjetas aquí</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {ghost && (
        <div className="fixed z-50 pointer-events-none w-64" style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -50%)" }}>
          <EntregaCard item={ghost.item} dragging />
        </div>
      )}

      <EntregaEditDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} item={editItem} onSaved={refresh} />
    </div>
  );
}
