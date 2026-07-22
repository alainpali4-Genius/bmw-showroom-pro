import { Copy, Trash2, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ZONAS_PLANO, zoneColor } from "@/lib/constants";

export default function PlazaInspector({ plaza, onChange, onDuplicate, onDelete }) {
  if (!plaza) {
    return (
      <div className="rounded-2xl bg-white border border-border shadow-soft p-5 h-full">
        <p className="text-sm text-bmw-soft/60">Selecciona una plaza para editarla, o crea una nueva.</p>
      </div>
    );
  }
  const accent = zoneColor(plaza.zona);

  return (
    <div className="rounded-2xl bg-white border border-border shadow-soft p-5 h-full overflow-auto bmw-scroll" data-testid="plaza-inspector">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
        <span className="font-display text-sm font-medium">Plaza seleccionada</span>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">Nombre</Label>
          <Input value={plaza.nombre} onChange={(e) => onChange({ nombre: e.target.value })} className="mt-1.5 h-10 rounded-xl" data-testid="plaza-name-input" />
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">Zona</Label>
          <Select value={plaza.zona} onValueChange={(v) => onChange({ zona: v })}>
            <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid="plaza-zone-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ZONAS_PLANO.map((z) => (
                <SelectItem key={z.name} value={z.name}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.color }} /> {z.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">Ancho</Label>
            <Input type="number" value={Math.round(plaza.w)} onChange={(e) => onChange({ w: Math.max(60, Number(e.target.value)) })} className="mt-1.5 h-10 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">Alto</Label>
            <Input type="number" value={Math.round(plaza.h)} onChange={(e) => onChange({ h: Math.max(60, Number(e.target.value)) })} className="mt-1.5 h-10 rounded-xl" />
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">Rotación</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => onChange({ rotation: (plaza.rotation || 0) - 15 })}><RotateCcw className="h-4 w-4" /></Button>
            <span className="flex-1 text-center text-sm tabular-nums">{Math.round(plaza.rotation || 0)}°</span>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => onChange({ rotation: (plaza.rotation || 0) + 15 })}><RotateCw className="h-4 w-4" /></Button>
            <Button variant="ghost" className="rounded-xl text-xs" onClick={() => onChange({ rotation: 0 })}>Reset</Button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onDuplicate} data-testid="duplicate-plaza-button">
            <Copy className="h-4 w-4 mr-2" /> Duplicar
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl text-bmw-red border-bmw-red/30 hover:bg-red-50" onClick={onDelete} data-testid="delete-plaza-button">
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
