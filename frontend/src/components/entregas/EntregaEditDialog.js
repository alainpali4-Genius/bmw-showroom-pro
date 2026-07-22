import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api, { apiError } from "@/lib/api";
import { ESTADOS_ENTREGA } from "@/lib/constants";
import { toast } from "sonner";

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function EntregaEditDialog({ open, onOpenChange, item, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setForm({
        estado_preparacion: item.estado_preparacion || "Pendiente",
        fecha_entrega: item.fecha_entrega || "",
        hora_entrega: item.hora_entrega || "",
        comercial: item.comercial || "",
        cliente: item.cliente || "",
        telefono: item.telefono || "",
        observaciones: item.observaciones || "",
      });
    }
  }, [open, item]);

  if (!form || !item) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await api.put(`/entregas/${item.id}`, form);
      toast.success("Entrega actualizada");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto bmw-scroll" data-testid="entrega-edit-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-light text-2xl">
            {item.marca} {item.modelo} <span className="text-bmw-soft/60">{item.acabado}</span>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{item.vin_corto} · {item.matricula || "sin matrícula"}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Estado de preparación">
              <Select value={form.estado_preparacion} onValueChange={(v) => set("estado_preparacion", v)}>
                <SelectTrigger className="h-11 rounded-xl" data-testid="entrega-estado-select"><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS_ENTREGA.map((e) => <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Fecha prevista">
            <Input type="date" value={form.fecha_entrega} onChange={(e) => set("fecha_entrega", e.target.value)} className="h-11 rounded-xl" data-testid="entrega-fecha-input" />
          </Field>
          <Field label="Hora prevista">
            <Input type="time" value={form.hora_entrega} onChange={(e) => set("hora_entrega", e.target.value)} className="h-11 rounded-xl" data-testid="entrega-hora-input" />
          </Field>
          <Field label="Cliente">
            <Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} className="h-11 rounded-xl" data-testid="entrega-cliente-input" />
          </Field>
          <Field label="Teléfono">
            <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className="h-11 rounded-xl" data-testid="entrega-telefono-input" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Comercial">
              <Input value={form.comercial} onChange={(e) => set("comercial", e.target.value)} placeholder="Nombre del comercial" className="h-11 rounded-xl" data-testid="entrega-comercial-input" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observaciones">
              <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={3} className="rounded-xl resize-none" data-testid="entrega-observaciones-input" />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1 h-11 rounded-xl bg-bmw-blue hover:bg-bmw-dark" onClick={submit} disabled={saving} data-testid="entrega-save-button">
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
