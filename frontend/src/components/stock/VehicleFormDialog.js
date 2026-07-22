import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api, { apiError } from "@/lib/api";
import { UBICACIONES, ESTADOS, CATEGORIAS, BMW_COLORS } from "@/lib/constants";
import { toast } from "sonner";
import VinScannerDialog from "./VinScannerDialog";

const EMPTY = {
  marca: "BMW", modelo: "", acabado: "", motor: "", categoria: "", color: "",
  codigo_color: "", vin: "", vin_corto: "", matricula: "", cliente: "",
  telefono: "", observaciones: "", ubicacion: "Stock", plaza: "", estado: "Disponible",
};

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function VehicleFormDialog({ open, onOpenChange, vehicle, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const isEdit = Boolean(vehicle);

  useEffect(() => {
    if (open) setForm(vehicle ? { ...EMPTY, ...vehicle } : EMPTY);
  }, [open, vehicle]);

  const set = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === "vin") next.vin_corto = v.slice(-7).toUpperCase();
    if (k === "color") {
      const c = BMW_COLORS.find((x) => x.name === v);
      if (c) next.codigo_color = c.code;
    }
    return next;
  });

  const onScanned = (data) => {
    setForm((f) => ({
      ...f,
      vin: data.vin || f.vin,
      vin_corto: data.vin_corto || (data.vin ? data.vin.slice(-7) : f.vin_corto),
      marca: data.marca || f.marca,
      modelo: data.modelo || f.modelo,
      motor: data.motor || f.motor,
      categoria: data.categoria || f.categoria,
    }));
  };

  const submit = async () => {
    if (!form.modelo && !form.vin) {
      toast.error("Indica al menos el modelo o el VIN.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await api.put(`/vehicles/${vehicle.id}`, form);
      else await api.post("/vehicles", form);
      toast.success(isEdit ? "Vehículo actualizado" : "Vehículo añadido");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bmw-scroll rounded-2xl" data-testid="vehicle-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-display font-light text-2xl">
              {isEdit ? "Editar vehículo" : "Nuevo vehículo"}
            </DialogTitle>
          </DialogHeader>

          {!isEdit && (
            <Button
              variant="outline"
              onClick={() => setScanOpen(true)}
              className="rounded-xl border-bmw-blue/30 text-bmw-blue hover:bg-bmw-blue/5 h-11"
              data-testid="open-vin-scanner-button"
            >
              <ScanLine className="h-4 w-4 mr-2" /> Escanear VIN con la cámara
            </Button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Marca">
              <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} className="h-11 rounded-xl" data-testid="field-marca" />
            </Field>
            <Field label="Modelo">
              <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Serie 3, X5, i4…" className="h-11 rounded-xl" data-testid="field-modelo" />
            </Field>
            <Field label="Acabado">
              <Input value={form.acabado} onChange={(e) => set("acabado", e.target.value)} placeholder="M Sport, xLine…" className="h-11 rounded-xl" data-testid="field-acabado" />
            </Field>
            <Field label="Motor">
              <Input value={form.motor} onChange={(e) => set("motor", e.target.value)} placeholder="320d, xDrive40i…" className="h-11 rounded-xl" data-testid="field-motor" />
            </Field>
            <Field label="Categoría">
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger className="h-11 rounded-xl" data-testid="field-categoria"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Color BMW">
              <Select value={form.color} onValueChange={(v) => set("color", v)}>
                <SelectTrigger className="h-11 rounded-xl" data-testid="field-color"><SelectValue placeholder="Selecciona color" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {BMW_COLORS.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c.hex }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Código color">
              <Input value={form.codigo_color} onChange={(e) => set("codigo_color", e.target.value)} className="h-11 rounded-xl" data-testid="field-codigo-color" />
            </Field>
            <Field label="VIN completo">
              <Input value={form.vin} onChange={(e) => set("vin", e.target.value.toUpperCase())} className="h-11 rounded-xl font-mono" data-testid="field-vin" />
            </Field>
            <Field label="VIN corto (7)">
              <Input value={form.vin_corto} onChange={(e) => set("vin_corto", e.target.value.toUpperCase())} maxLength={7} className="h-11 rounded-xl font-mono" data-testid="field-vin-corto" />
            </Field>
            <Field label="Matrícula">
              <Input value={form.matricula} onChange={(e) => set("matricula", e.target.value.toUpperCase())} className="h-11 rounded-xl" data-testid="field-matricula" />
            </Field>
            <Field label="Ubicación">
              <Select value={form.ubicacion} onValueChange={(v) => set("ubicacion", v)}>
                <SelectTrigger className="h-11 rounded-xl" data-testid="field-ubicacion"><SelectValue /></SelectTrigger>
                <SelectContent>{UBICACIONES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Plaza">
              <Input value={form.plaza} onChange={(e) => set("plaza", e.target.value)} placeholder="P1, X2, Taller 1…" className="h-11 rounded-xl" data-testid="field-plaza" />
            </Field>
            <Field label="Estado">
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger className="h-11 rounded-xl" data-testid="field-estado"><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Cliente">
              <Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} className="h-11 rounded-xl" data-testid="field-cliente" />
            </Field>
            <Field label="Teléfono">
              <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className="h-11 rounded-xl" data-testid="field-telefono" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Observaciones">
                <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={3} className="rounded-xl resize-none" data-testid="field-observaciones" />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => onOpenChange(false)} data-testid="cancel-vehicle-button">
              Cancelar
            </Button>
            <Button className="flex-1 h-11 rounded-xl bg-bmw-blue hover:bg-bmw-dark" onClick={submit} disabled={saving} data-testid="save-vehicle-button">
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Añadir vehículo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VinScannerDialog open={scanOpen} onOpenChange={setScanOpen} onScanned={onScanned} />
    </>
  );
}
