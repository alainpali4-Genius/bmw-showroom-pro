import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil, Check, Plus, ZoomIn, ZoomOut, Undo2, Redo2, AlignHorizontalJustifyStart,
  Loader2, Move, Maximize, Search, Frame,
} from "lucide-react";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import PlazaNode from "@/components/plano/PlazaNode";
import VehicleTray from "@/components/plano/VehicleTray";
import PlazaInspector from "@/components/plano/PlazaInspector";
import VehicleCard from "@/components/plano/VehicleCard";
import VehicleFormDialog from "@/components/stock/VehicleFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zoneColor } from "@/lib/constants";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function StatChip({ label, value, dot, testid }) {
  return (
    <div data-testid={testid} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-border shadow-soft">
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-bmw-soft/60">{label}</span>
    </div>
  );
}

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
  const [vpSize, setVpSize] = useState({ w: 800, h: 600 });
  const [highlightId, setHighlightId] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const pinch = useRef(null);
  const highlightTimer = useRef(null);
  const searchTimer = useRef(null);
  const fitted = useRef(false);

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

  const fitToScreen = useCallback(() => {
    const ps = plazasRef.current;
    if (!ps.length) return;
    const minX = Math.min(...ps.map((p) => p.x));
    const minY = Math.min(...ps.map((p) => p.y));
    const maxX = Math.max(...ps.map((p) => p.x + p.w));
    const maxY = Math.max(...ps.map((p) => p.y + p.h));
    const pad = 60;
    const bw = maxX - minX + pad * 2, bh = maxY - minY + pad * 2;
    const s = clamp(Math.min(vpSize.w / bw, vpSize.h / bh), 0.2, 2.5);
    setScale(s);
    setOffset({
      x: vpSize.w / 2 - (minX + (maxX - minX) / 2) * s,
      y: vpSize.h / 2 - (minY + (maxY - minY) / 2) * s,
    });
  }, [vpSize]);

  const focusVehicle = (v) => {
    clearTimeout(searchTimer.current);
    setResults([]); setQuery("");
    const plaza = plazasRef.current.find((p) => p.id === v.plaza_id);
    if (!plaza) {
      if (modeRef.current !== "normal") setMode("normal");
      toast.info(`${v.modelo || "Vehículo"} está en la bandeja «Sin plaza»`);
      return;
    }
    const s = clamp(Math.min(vpSize.w / (plaza.w * 2), vpSize.h / (plaza.h * 1.4)), 0.5, 1.8);
    setScale(s);
    setOffset({
      x: vpSize.w / 2 - (plaza.x + plaza.w / 2) * s,
      y: vpSize.h / 2 - (plaza.y + plaza.h / 2) * s,
    });
    setHighlightId(plaza.id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 3000);
  };

  const runSearch = (q) => {
    setQuery(q);
    const s = q.trim().toLowerCase();
    if (!s) { setResults([]); return; }
    const r = vehiclesRef.current.filter((v) =>
      (v.modelo || "").toLowerCase().includes(s) ||
      (v.vin || "").toLowerCase().includes(s) ||
      (v.vin_corto || "").toLowerCase().includes(s) ||
      (v.matricula || "").toLowerCase().includes(s)
    ).slice(0, 8);
    setResults(r);
    if (r.length === 1) focusVehicle(r[0]);
  };

  // Tamaño del viewport (rendimiento + fit)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const update = () => setVpSize({ w: vp.clientWidth, h: vp.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  // Auto-ajustar una vez al cargar
  useEffect(() => {
    if (!fitted.current && plazas.length > 0 && vpSize.w > 100) {
      fitted.current = true;
      fitToScreen();
    }
  }, [plazas, vpSize, fitToScreen]);

  // Zoom por pellizco (solo en modo edición; bloqueado en modo normal)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e) => {
      if (modeRef.current !== "edit" || e.touches.length !== 2) return;
      interaction.current = null;
      const r = vp.getBoundingClientRect();
      pinch.current = {
        d: dist(e.touches), s: scaleRef.current,
        mx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
        my: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top,
        ox: offsetRef.current.x, oy: offsetRef.current.y,
      };
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!pinch.current || e.touches.length !== 2) return;
      e.preventDefault();
      const s1 = clamp(pinch.current.s * (dist(e.touches) / pinch.current.d), 0.2, 2.5);
      const k = s1 / pinch.current.s;
      setScale(s1);
      setOffset({
        x: pinch.current.mx - (pinch.current.mx - pinch.current.ox) * k,
        y: pinch.current.my - (pinch.current.my - pinch.current.oy) * k,
      });
    };
    const onEnd = (e) => { if (e.touches.length < 2) { pinch.current = null; isInteracting.current = false; } };
    vp.addEventListener("touchstart", onStart, { passive: false });
    vp.addEventListener("touchmove", onMove, { passive: false });
    vp.addEventListener("touchend", onEnd);
    return () => {
      vp.removeEventListener("touchstart", onStart);
      vp.removeEventListener("touchmove", onMove);
      vp.removeEventListener("touchend", onEnd);
    };
  }, []);

  const renderMiniMap = () => {
    if (!plazas.length) return null;
    const MW = 168, MH = 116, pad = 10;
    const minX = Math.min(...plazas.map((p) => p.x));
    const minY = Math.min(...plazas.map((p) => p.y));
    const maxX = Math.max(...plazas.map((p) => p.x + p.w));
    const maxY = Math.max(...plazas.map((p) => p.y + p.h));
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const mmS = Math.min((MW - pad * 2) / bw, (MH - pad * 2) / bh);
    const toX = (x) => pad + (x - minX) * mmS;
    const toY = (y) => pad + (y - minY) * mmS;
    const vx = (-offset.x) / scale, vy = (-offset.y) / scale;
    const onClick = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const wx = (e.clientX - r.left - pad) / mmS + minX;
      const wy = (e.clientY - r.top - pad) / mmS + minY;
      setOffset({ x: vpSize.w / 2 - wx * scale, y: vpSize.h / 2 - wy * scale });
    };
    return (
      <div className="absolute top-4 right-4 rounded-xl bg-white/95 backdrop-blur border border-border shadow-soft overflow-hidden" data-testid="plano-minimap">
        <svg width={MW} height={MH} onClick={onClick} className="cursor-pointer block">
          {plazas.map((p) => {
            const occ = Boolean(vehicleByPlaza[p.id]);
            return (
              <rect key={p.id} x={toX(p.x)} y={toY(p.y)} width={Math.max(2, p.w * mmS)} height={Math.max(2, p.h * mmS)} rx={2}
                fill={occ ? zoneColor(p.zona) : "#fff"} stroke={zoneColor(p.zona)} strokeWidth="1" opacity={occ ? 0.9 : 0.5} />
            );
          })}
          <rect x={toX(vx)} y={toY(vy)} width={Math.max(4, (vpSize.w / scale) * mmS)} height={Math.max(4, (vpSize.h / scale) * mmS)}
            fill="rgba(0,102,177,0.12)" stroke="#0066B1" strokeWidth="1.5" />
        </svg>
      </div>
    );
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

  const stats = useMemo(() => {
    const total = plazas.length;
    const ocupadas = plazas.filter((p) => vehicleByPlaza[p.id]).length;
    return { total, ocupadas, libres: total - ocupadas, sinPlaza: unassigned.length };
  }, [plazas, vehicleByPlaza, unassigned]);

  const visiblePlazas = useMemo(() => {
    const m = 240;
    const l = (-offset.x) / scale - m, t = (-offset.y) / scale - m;
    const r = (vpSize.w - offset.x) / scale + m, b = (vpSize.h - offset.y) / scale + m;
    return plazas.filter((p) =>
      p.id === selectedId || p.id === highlightId ||
      (p.x < r && p.x + p.w > l && p.y < b && p.y + p.h > t)
    );
  }, [plazas, offset, scale, vpSize, selectedId, highlightId, vehicleByPlaza]);

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

      {/* Estadísticas + buscador inteligente */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatChip label="Plazas" value={stats.total} testid="stat-total" />
        <StatChip label="Ocupadas" value={stats.ocupadas} dot="#1B8A4B" testid="stat-ocupadas" />
        <StatChip label="Libres" value={stats.libres} dot="#5BC2E7" testid="stat-libres" />
        <StatChip label="Sin plaza" value={stats.sinPlaza} dot="#E7222E" testid="stat-sinplaza" />
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bmw-soft/50 z-10" />
          <Input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && results.length) focusVehicle(results[0]); }}
            placeholder="Buscar modelo, VIN, matrícula…"
            className="pl-10 h-11 rounded-xl border-transparent bg-white shadow-soft"
            data-testid="plano-search-input"
          />
          {query && (
            <div className="absolute z-40 mt-2 w-full rounded-xl bg-white border border-border shadow-card overflow-hidden max-h-72 overflow-y-auto bmw-scroll" data-testid="search-results">
              {results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-bmw-soft/60">Sin resultados</p>
              ) : (
                results.map((v) => (
                  <button key={v.id} onClick={() => focusVehicle(v)} data-testid={`search-result-${v.id}`}
                    className="w-full text-left px-4 py-2.5 hover:bg-bmw-surface flex items-center justify-between gap-3 transition-colors">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{v.modelo} {v.acabado}</span>
                      <span className="block text-xs text-bmw-soft/60 truncate font-mono">{v.vin_corto || v.matricula || v.vin}</span>
                    </span>
                    <span className="text-xs text-bmw-soft/60 shrink-0">{v.plaza || "Sin plaza"}</span>
                  </button>
                ))
              )}
            </div>
          )}
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
            {visiblePlazas.map((p) => (
              <PlazaNode
                key={p.id}
                plaza={p}
                vehicle={vehicleByPlaza[p.id]}
                mode={mode}
                selected={selectedId === p.id}
                dropTarget={dropId === p.id}
                highlight={highlightId === p.id}
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

          {renderMiniMap()}

          {/* Controles de zoom */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button onClick={fitToScreen} className="h-10 w-10 grid place-items-center rounded-xl bg-white border border-border shadow-soft hover:bg-bmw-surface" data-testid="fit-button" title="Ajustar a pantalla"><Frame className="h-4 w-4" /></button>
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
ats"] });
        }}
      />
    </div>
  );
}
