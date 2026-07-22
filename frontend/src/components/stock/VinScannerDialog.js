import { useRef, useState } from "react";
import { Camera, Loader2, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";

export default function VinScannerDialog({ open, onOpenChange, onScanned }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setPreview(""); setLoading(false); };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const { data } = await api.post("/vehicles/scan-vin", { image_base64: preview });
      if (!data.vin) {
        toast.error("No se pudo leer el VIN. Prueba con una foto más nítida.");
      } else {
        toast.success(`VIN detectado: ${data.vin}`);
        onScanned(data);
        onOpenChange(false);
        reset();
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl" data-testid="vin-scanner-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-light text-2xl flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-bmw-blue" /> Escanear VIN
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-bmw-soft/70 -mt-1">
          Haz una foto de la etiqueta del bastidor. La IA leerá el VIN y rellenará los datos.
        </p>

        <input
          ref={inputRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleFile} data-testid="vin-file-input"
        />

        {preview ? (
          <img src={preview} alt="VIN" className="w-full rounded-xl border border-border object-cover max-h-56" />
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            data-testid="vin-capture-button"
            className="w-full rounded-xl border-2 border-dashed border-border py-10 flex flex-col items-center gap-3 hover:border-bmw-blue hover:bg-bmw-surface transition-colors"
          >
            <Camera className="h-8 w-8 text-bmw-blue" strokeWidth={1.5} />
            <span className="text-sm font-medium">Abrir cámara / elegir foto</span>
          </button>
        )}

        <div className="flex gap-3 mt-2">
          {preview && (
            <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setPreview("")} data-testid="vin-retake-button">
              Repetir
            </Button>
          )}
          <Button
            className="flex-1 rounded-xl h-11 bg-bmw-blue hover:bg-bmw-dark"
            disabled={!preview || loading} onClick={analyze} data-testid="vin-analyze-button"
          >
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando…</> : "Leer VIN"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
