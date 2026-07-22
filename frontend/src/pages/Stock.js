import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Upload, Download, Pencil, Trash2, FileSpreadsheet,
  SlidersHorizontal, Car,
} from "lucide-react";
import api, { apiError } from "@/lib/api";
import { UBICACIONES, ESTADOS, CATEGORIAS, ESTADO_COLORS, BMW_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import VehicleFormDialog from "@/components/stock/VehicleFormDialog";

const colorHex = (name) => BMW_COLORS.find((c) => c.name === name)?.hex || "#C9CCD1";

function EstadoBadge({ estado }) {
  const c = ESTADO_COLORS[estado] || ESTADO_COLORS.Disponible;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={{ background: c.bg, color: c.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
      {estado}
    </span>
  );
}

export default function Stock() {
  const qc = useQueryClient();
  const importRef = useRef(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ ubicacion: "", estado: "", categoria: "" });
  const [sort, setSort] = useState("created_at:desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const [sortBy, order] = sort.split(":");

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles", search, filters, sort],
    queryFn: async () => {
      const params = { sort_by: sortBy, order };
      if (search) params.search = search;
      if (filters.ubicacion) params.ubicacion = filters.ubicacion;
      if (filters.estado) params.estado = filters.estado;
      if (filters.categoria) params.categoria = filters.categoria;
      return (await api.get("/vehicles", { params })).data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (v) => { setEditing(v); setFormOpen(true); };

  const doDelete = async () => {
    try {
      await api.delete(`/vehicles/${toDelete.id}`);
      toast.success("Vehículo eliminado");
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setToDelete(null);
    }
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/vehicles/import", fd);
      toast.success(`${data.imported} vehículos importados`);
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      e.target.value = "";
    }
  };

  const download = async (path, filename) => {
    try {
      const res = await api.get(path, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const clearFilters = () => { setFilters({ ubicacion: "", estado: "", categoria: "" }); setSearch(""); };
  const activeFilters = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-bmw-blue">Inventario</p>
          <h1 className="font-display text-3xl sm:text-4xl font-light mt-2">Gestión de Stock</h1>
          <p className="text-bmw-soft/70 mt-1">{vehicles.length} vehículos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doImport} data-testid="import-file-input" />
          <Button variant="outline" className="rounded-xl h-11" onClick={() => importRef.current?.click()} data-testid="import-button">
            <Upload className="h-4 w-4 mr-2" /> Importar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl h-11" data-testid="export-button">
                <Download className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => download("/vehicles/export/xlsx", "stock_bmw.xlsx")} data-testid="export-xlsx">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => download("/vehicles/export/csv", "stock_bmw.csv")} data-testid="export-csv">
                <Download className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => download("/vehicles/template/xlsx", "plantilla_stock.xlsx")} data-testid="export-template">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Plantilla de importación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="rounded-xl h-11 bg-bmw-blue hover:bg-bmw-dark" onClick={openNew} data-testid="add-vehicle-button">
            <Plus className="h-4 w-4 mr-2" /> Añadir
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-6 rounded-2xl bg-white border border-border shadow-soft p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bmw-soft/50" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por modelo, VIN, matrícula, cliente…"
                 className="pl-10 h-11 rounded-xl border-transparent bg-bmw-surface" data-testid="search-input" />
        </div>
        <Select value={filters.ubicacion || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, ubicacion: v === "all" ? "" : v }))}>
          <SelectTrigger className="w-auto min-w-[130px] h-11 rounded-xl" data-testid="filter-ubicacion"><SelectValue placeholder="Ubicación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ubicaciones</SelectItem>
            {UBICACIONES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.estado || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, estado: v === "all" ? "" : v }))}>
          <SelectTrigger className="w-auto min-w-[120px] h-11 rounded-xl" data-testid="filter-estado"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.categoria || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, categoria: v === "all" ? "" : v }))}>
          <SelectTrigger className="w-auto min-w-[120px] h-11 rounded-xl" data-testid="filter-categoria"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-auto min-w-[120px] h-11 rounded-xl" data-testid="sort-select">
            <SlidersHorizontal className="h-4 w-4 mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Más recientes</SelectItem>
            <SelectItem value="created_at:asc">Más antiguos</SelectItem>
            <SelectItem value="modelo:asc">Modelo (A-Z)</SelectItem>
            <SelectItem value="modelo:desc">Modelo (Z-A)</SelectItem>
            <SelectItem value="estado:asc">Estado</SelectItem>
          </SelectContent>
        </Select>
        {activeFilters > 0 && (
          <Button variant="ghost" className="rounded-xl h-11 text-bmw-red" onClick={clearFilters} data-testid="clear-filters">Limpiar</Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="mt-6 space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/60 border border-border animate-pulse" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-white p-12 text-center shadow-soft" data-testid="empty-state">
          <div className="h-14 w-14 rounded-2xl bg-bmw-surface grid place-items-center mx-auto">
            <Car className="h-6 w-6 text-bmw-blue" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-xl mt-5">No hay vehículos</h3>
          <p className="text-bmw-soft/70 mt-1">Añade tu primer vehículo, escanéalo con la cámara o importa un Excel.</p>
          <Button className="mt-5 rounded-xl bg-bmw-blue hover:bg-bmw-dark" onClick={openNew} data-testid="empty-add-button">
            <Plus className="h-4 w-4 mr-2" /> Añadir vehículo
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden md:block rounded-2xl bg-white border border-border shadow-soft overflow-hidden">
            <table className="w-full text-sm" data-testid="vehicles-table">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-bmw-soft/60 border-b border-border">
                  <th className="px-5 py-3.5 font-semibold">Vehículo</th>
                  <th className="px-5 py-3.5 font-semibold">Motor</th>
                  <th className="px-5 py-3.5 font-semibold">Color</th>
                  <th className="px-5 py-3.5 font-semibold">VIN / Matrícula</th>
                  <th className="px-5 py-3.5 font-semibold">Ubicación</th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-bmw-surface/60 transition-colors cursor-pointer" onClick={() => openEdit(v)} data-testid={`vehicle-row-${v.id}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{v.modelo || "—"} <span className="text-bmw-soft/60 font-normal">{v.acabado}</span></p>
                      <p className="text-xs text-bmw-soft/50">{v.categoria}</p>
                    </td>
                    <td className="px-5 py-3.5 text-bmw-soft">{v.motor || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: colorHex(v.color) }} />
                        <span className="text-bmw-soft">{v.color || "—"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs">{v.vin_corto || "—"}</p>
                      <p className="text-xs text-bmw-soft/50">{v.matricula || ""}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-bmw-soft">{v.ubicacion}{v.plaza ? ` · ${v.plaza}` : ""}</span>
                    </td>
                    <td className="px-5 py-3.5"><EstadoBadge estado={v.estado} /></td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(v)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-bmw-surface text-bmw-soft" data-testid={`edit-${v.id}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setToDelete(v)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-red-50 text-bmw-red" data-testid={`delete-${v.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 md:hidden space-y-3">
            {vehicles.map((v) => (
              <div key={v.id} className="rounded-2xl bg-white border border-border shadow-soft p-4" onClick={() => openEdit(v)} data-testid={`vehicle-card-${v.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-1 h-8 w-8 shrink-0 rounded-full border border-black/10" style={{ background: colorHex(v.color) }} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{v.modelo || "—"} {v.acabado}</p>
                      <p className="text-xs text-bmw-soft/60 truncate">{v.motor} · {v.color || "—"}</p>
                      <p className="text-xs text-bmw-soft/50 font-mono mt-0.5">{v.vin_corto || v.matricula || "—"}</p>
                    </div>
                  </div>
                  <EstadoBadge estado={v.estado} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-bmw-soft/70">{v.ubicacion}{v.plaza ? ` · ${v.plaza}` : ""}</span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(v)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-bmw-surface text-bmw-soft"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setToDelete(v)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-red-50 text-bmw-red"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <VehicleFormDialog open={formOpen} onOpenChange={setFormOpen} vehicle={editing} onSaved={refresh} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-light text-2xl">¿Eliminar vehículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {toDelete?.modelo} {toDelete?.acabado} de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-bmw-red hover:bg-bmw-red/90" onClick={doDelete} data-testid="confirm-delete-button">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
