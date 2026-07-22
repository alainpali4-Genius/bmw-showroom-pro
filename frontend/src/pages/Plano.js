import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil, Check, Plus, ZoomIn, ZoomOut, Undo2, Redo2, AlignHorizontalJustifyStart,
  Loader2, Move, Maximize,
} from "lucide-react";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import PlazaNode from "@/components/plano/PlazaNode";
import VehicleTray from "@/components/plano/VehicleTray";
import PlazaInspector from "@/components/plano/PlazaInspector";
import VehicleCard from "@/components/plano/VehicleCard";
import VehicleFormDialog from "@/components/stock/VehicleFormDialog";
import { Button } from "@/components/ui/button";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function Plano() {
  const qc = useQueryClient();
  const cid = useRef(uid()).current;
  const viewportRef = useRef(null);
  const interaction = useRef(null);
  const isInteracting = useRef(false);
  const dragSnapshot = useRef(null);
  const saveTimer = useRef(null);

  const [mode, setMode] = useState("normal");
  const [plazas, setPlazas] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scale, setScale] = useState(0.7);
  const [offset, setOffset] = useState({ x: 200, y: 80 });
  const [ghost, setGhost] = useState(null);
  const [dropId, setDropId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [ficha, setFicha] = useState(null);

  // Refs espejo para handlers de ventana
  const scaleRef = useRef(scale); scaleRef.current = scale;
  const offsetRef = useRef(offset); offsetRef.current = offset;
  const modeRef = useRef(mode); modeRef.current = mode;
  const plazasRef = useRef(plazas); plazasRef.current = plazas;

  const { data: planoData } = useQuery({
    queryKey: ["plano"],
    queryFn: async () => (await api.get("/plano")).data,
    refetchInterval: 20000,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-all"],
    queryFn: async () => (await api.get("/vehicles")).data,
    refetchInterval: 20000,
  });
  const vehiclesRef = useRef(vehicles); vehiclesRef.current = vehicles;

  // Sincroniza layout desde el servidor cuando no estamos interactuando
  useEffect(() => {
    if (planoData?.plazas && !isInteracting.current) {
      setPlazas(planoData.plazas);
    }
  }, [planoData]);

  const vehicleByPlaza = useMemo(() => {
    const m = {};
    vehicles.forEach((v) => { if (v.plaza_id) m[v.plaza_id] = v; });
    return m;
  }, [vehicles]);

  const unassigned = useMemo(() => vehicles.filter((v) => !v.plaza_id), [vehicles]);

  // ---------- Guardado ----------
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.put("/plano/save", { plazas: plazasRef.current }, { headers: { "X-Client-Id": cid } });
      } catch (e) {
        toast.error(apiError(e));
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [cid]);

  const applyPlazas = useCallback((next) => {
    setPast((p) => [...p.slice(-49), plazasRef.current]);
    setFuture([]);
    setPlazas(next);
    plazasRef.current = next;
    scheduleSave();
  }, [scheduleSave]);

  const undo = () => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [plazasRef.current, ...f]);
      setPlazas(prev); plazasRef.current = prev; scheduleSave();
      return p.slice(0, -1);
    });
  };
  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const nxt = f[0];
      setPast((p) => [...p, plazasRef.current]);
      setPlazas(nxt); plazasRef.current = nxt; scheduleSave();
      return f.slice(1);
    });
  };

  const patchPlazaLocal = (id, patch) => {
    setPlazas((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      plazasRef.current = next;
      return next;
    });
  };

  const commitPatch = (id, patch) => {
    setPast((p) => [...p.slice(-49), plazasRef.current]);
    setFuture([]);
    patchPlazaLocal(id, patch);
    scheduleSave();
  };

  // ---------- Asignación de vehículos ----------
  const assign = async (vehicleId, plazaId) => {
    try {
      await api.put("/plano/assign", { vehicle_id: vehicleId, plaza_id: plazaId },
        { headers: { "X-Client-Id": cid } });
      qc.invalidateQueries({ queryKey: ["vehicles-all"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  // ---------- Interacción puntero ----------
  const startInteraction = (kind, extra) => {
    interaction.current = { kind, ...extra };
    isInteracting.current = true;
  };

  const handleDown = (e) => {
    const target = e.target;
    const vehEl = target.closest?.("[data-vehicle-id]");
    const inCanvas = target.closest?.("[data-canvas]");

    // Arrastrar vehículo (modo normal o desde bandeja)
    if (modeRef.current === "normal" && vehEl) {
      const id = vehEl.getAttribute("data-vehicle-id");
      const veh = vehiclesRef.current.find((v) => v.id === id);
      startInteraction("vehicle", { id, veh, startX: e.clientX, startY: e.clientY });
      setGhost({ vehicle: veh, x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }
    if (!inCanvas) return;

    const plazaEl = target.closest("[data-plaza-id]");
    const handleEl = target.closest("[data-handle]");

    if (modeRef.current === "edit" && handleEl && plazaEl) {
      const id = plazaEl.getAttribute("data-plaza-id");
      const p = plazasRef.current.find((x) => x.id === id);
      setSelectedId(id);
      dragSnapshot.current = plazasRef.current;
      startInteraction(handleEl.getAttribute("data-handle"), { id, startX: e.clientX, startY: e.clientY, p: { ...p } });
      e.preventDefault();
      return;
    }
    if (modeRef.current === "edit" && plazaEl) {
      const id = plazaEl.getAttribute("data-plaza-id");
      const p = plazasRef.current.find((x) => x.id === id);
      setSelectedId(id);
      dragSnapshot.current = plazasRef.current;
      startInteraction("move", { id, startX: e.clientX, startY: e.clientY, p: { ...p } });
      e.preventDefault();
      return;
    }

    // Pan
    if (modeRef.current === "edit") setSelectedId(null);
    startInteraction("pan", { startX: e.clientX, startY: e.clientY, offset: { ...offsetRef.current } });
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      const it = interaction.current;
      if (!it) return;
      if (it.kind === "pan") {
        setOffset({ x: it.offset.x + (e.clientX - it.startX), y: it.offset.y + (e.clientY - it.startY) });
        return;
      }
      if (it.kind === "vehicle") {
        setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const pe = el?.closest?.("[data-plaza-id]");
        setDropId(pe ? pe.getAttribute("data-plaza-id") : null);
        return;
      }
      const s = scaleRef.current;
      const dx = (e.clientX - it.startX) / s;
      const dy = (e.clientY - it.startY) / s;
      if (it.kind === "move") patchPlazaLocal(it.id, { x: it.p.x + dx, y: it.p.y + dy });
      else if (it.kind === "resize") patchPlazaLocal(it.id, { w: Math.max(60, it.p.w + dx), h: Math.max(60, it.p.h + dy) });
      else if (it.kind === "rotate") {
        const el = viewportRef.current?.querySelector(`[data-plaza-id="${it.id}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          const ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90;
          patchPlazaLocal(it.id, { rotation: Math.round(ang) });
        }
      }
    };

    const onUp = (e) => {
      const it = interaction.current;
      interaction.current = null;
      if (!it) return;

      if (it.kind === "vehicle") {
        setGhost(null); setDropId(null);
        const dist = Math.hypot(e.clientX - it.startX, e.clientY - it.startY);
        if (dist < 6) {
          setFicha(it.veh);
        } else {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const pe = el?.closest?.("[data-plaza-id]");
          const tray = el?.closest?.("[data-tray]");
          if (pe) assign(it.id, pe.getAttribute("data-plaza-id"));
          else if (tray) assign(it.id, null);
        }
        setTimeout(() => { isInteracting.current = false; }, 50);
        return;
      }
      if (it.kind === "pan") { isInteracting.current = false; return; }

      // move / resize / rotate -> commit
      if (dragSnapshot.current) {
        setPast((p) => [...p.slice(-49), dragSnapshot.current]);
        setFuture([]);
        dragSnapshot.current = null;
      }
      scheduleSave();
      setTimeout(() => { isInteracting.current = false; }, 50);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scheduleSave]);

  // Zoom con rueda
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const s0 = scaleRef.current;
      const s1 = clamp(s0 * (e.deltaY < 0 ? 1.1 : 0.9), 0.2, 2.5);
      const k = s1 / s0;
      setOffset((o) => ({ x: mx - (mx - o.x) * k, y: my - (my - o.y) * k }));
      setScale(s1);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBtn = (dir) => {
    const vp = viewportRef.current.getBoundingClientRect();
    const mx = vp.width / 2, my = vp.height / 2;
    const s0 = scaleRef.current;
    const s1 = clamp(s0 * (dir > 0 ? 1.2 : 0.8), 0.2, 2.5);
    const k = s1 / s0;
    setOffset((o) => ({ x: mx - (mx - o.x) * k, y: my - (my - o.y) * k }));
    setScale(s1);
  };

  // ---------- Acciones de plaza ----------
  const nextName = () => {
    let n = 1;
    const names = new Set(plazasRef.current.map((p) => p.nombre));
    while (names.has(`P${n}`)) n++;
    return `P${n}`;
  };

  const addPlaza = () => {
    const vp = viewportRef.current.getBoundingClientRect();
    const wx = (vp.width / 2 - offsetRef.current.x) / scaleRef.current;
    const wy = (vp.height / 2 - offsetRef.current.y) / scaleRef.current;
    const p = { id: uid(), nombre: nextName(), zona: "Exposición", x: wx - 60, y: wy - 100, w: 120, h: 200, rotation: 0 };
    applyPlazas([...plazasRef.current, p]);
    setSelectedId(p.id);
  };

  const duplicatePlaza = () => {
    const p = plazasRef.current.find((x) => x.id === selectedId);
    if (!p) return;
    const copy = { ...p, id: uid(), nombre: `${p.nombre}·`, x: p.x + 24, y: p.y + 24 };
    applyPlazas([...plazasRef.current, copy]);
    setSelectedId(copy.id);
  };

  const deletePlaza = () => {
    if (!selectedId) return;
    applyPlazas(plazasRef.current.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };

  const autoAlign = () => {
    const g = 20;
    applyPlazas(plazasRef.current.map((p) => ({ ...p, x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g })));
    toast.success("Plazas alineadas");
  };

  // ---------- WebSocket tiempo real ----------
  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL.replace(/^http/, "ws");
    let ws, alive = true, retry;
    const connect = () => {
      try {
        ws = new WebSocket(`${base}/api/ws/plano`);
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "plano_update" && msg.origin !== cid && !isInteracting.current) {
              qc.invalidateQueries({ queryKey: ["plano"] });
              qc.invalidateQueries({ queryKey: ["vehicles-all"] });
            }
          } catch { /* noop */ }
        };
        ws.onclose = () => { if (alive) { clearTimeout(retry); retry = setTimeout(connect, 3000); } };
        ws.onerror = () => { /* onclose gestiona la reconexión */ };
      } catch { /* noop */ }
    };
    connect();
    return () => { alive = false; clearTimeout(retry); try { ws && ws.close(); } catch { /* noop */ } };
  }, [cid, qc]);

  const selectedPlaza = plazas.find((p) => p.id === selectedId) || null;
  const editing = mode === "edit";

  return (
    <div className="max-w-none h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-6.5rem)] flex flex-col">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-bmw-blue">Exposición</p>
          <h1 className="font-display text-2xl sm:text-3xl font-light mt-1">Plano de Exposición</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-bmw-soft/60 mr-1">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</> : <><Check className="h-3.5 w-3.5 text-green-600" /> Guardado</>}
          </span>
          <Button
            onClick={() => { setMode(editing ? "normal" : "edit"); setSelectedId(null); }}
            className={`rounded-xl h-11 ${editing ? "bg-bmw-red hover:bg-bmw-red/90" : "bg-bmw-blue hover:bg-bmw-dark"}`}
            data-testid="toggle-edit-button"
          >
            {editing ? <><Check className="h-4 w-4 mr-2" /> Finalizar edición</> : <><Pencil className="h-4 w-4 mr-2" /> Editar plano</>}
          </Button>
        </div>
      </div>

      {/* Barra de herramientas edición */}
      {editing && (
        <div className="flex flex-wrap items-center gap-2 mb-3 animate-fade-up">
          <Button variant="outline" className="rounded-xl h-10" onClick={addPlaza} data-testid="add-plaza-button"><Plus className="h-4 w-4 mr-2" /> Nueva plaza</Button>
          <Button variant="outline" className="rounded-xl h-10" onClick={autoAlign} data-testid="align-button"><AlignHorizontalJustifyStart className="h-4 w-4 mr-2" /> Alinear</Button>
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={undo} disabled={!past.length} data-testid="undo-button"><Undo2 className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={redo} disabled={!future.length} data-testid="redo-button"><Redo2 className="h-4 w-4" /></Button>
          <span className="text-xs text-bmw-soft/60 ml-1 hidden md:inline">Arrastra las plazas para moverlas · usa los tiradores para girar y redimensionar</span>
        </div>
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0" onPointerDown={handleDown}>
        {/* Lienzo */}
        <div
          ref={viewportRef}
          data-canvas="1"
          data-testid="plano-canvas"
          className="relative flex-1 min-h-[45vh] rounded-2xl bg-white border border-border shadow-soft overflow-hidden touch-none select-none"
          style={{ backgroundImage: "radial-gradient(#e6e8ec 1px, transparent 1px)", backgroundSize: `${24 * scale}px ${24 * scale}px`, backgroundPosition: `${offset.x}px ${offset.y}px`, cursor: editing ? "default" : "grab" }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, width: 4000, height: 4000 }}
          >
            {plazas.map((p) => (
              <PlazaNode
                key={p.id}
                plaza={p}
                vehicle={vehicleByPlaza[p.id]}
                mode={mode}
                selected={selectedId === p.id}
                dropTarget={dropId === p.id}
              />
            ))}
          </div>

          {plazas.length === 0 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <Maximize className="h-8 w-8 text-bmw-blue/40 mx-auto" strokeWidth={1.5} />
                <p className="mt-3 font-display text-lg font-light">El plano está vacío</p>
                <p className="text-sm text-bmw-soft/60">Pulsa «Editar plano» y añade tu primera plaza.</p>
              </div>
            </div>
          )}

          {/* Controles de zoom */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button onClick={() => zoomBtn(1)} className="h-10 w-10 grid place-items-center rounded-xl bg-white border border-border shadow-soft hover:bg-bmw-surface" data-testid="zoom-in"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={() => zoomBtn(-1)} className="h-10 w-10 grid place-items-center rounded-xl bg-white border border-border shadow-soft hover:bg-bmw-surface" data-testid="zoom-out"><ZoomOut className="h-4 w-4" /></button>
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-border text-xs text-bmw-soft">
            <Move className="h-3.5 w-3.5" /> {Math.round(scale * 100)}%
          </div>
        </div>

        {/* Panel lateral */}
        <div className="lg:w-80 shrink-0 h-56 lg:h-auto">
          {editing ? (
            <PlazaInspector
              plaza={selectedPlaza}
              onChange={(patch) => selectedPlaza && commitPatch(selectedPlaza.id, patch)}
              onDuplicate={duplicatePlaza}
              onDelete={deletePlaza}
            />
          ) : (
            <VehicleTray vehicles={unassigned} />
          )}
        </div>
      </div>

      {/* Ghost de arrastre */}
      {ghost && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -50%)", width: 120, height: 170 }}
        >
          <div className="h-full w-full rounded-2xl bg-white border-2 border-bmw-blue shadow-card opacity-90">
            <VehicleCard vehicle={ghost.vehicle} />
          </div>
        </div>
      )}

      <VehicleFormDialog
        open={!!ficha}
        onOpenChange={(o) => !o && setFicha(null)}
        vehicle={ficha}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["vehicles-all"] });
          qc.invalidateQueries({ queryKey: ["stats"] });
        }}
      />
    </div>
  );
}
