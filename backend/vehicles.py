import io
import csv
import uuid
from datetime import datetime, timezone
from typing import Optional, List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from db import db
from auth import get_current_user
from vin_ocr import extract_vin_from_image

vehicles_router = APIRouter(prefix="/api", tags=["vehicles"])

FIELDS = [
    "marca", "modelo", "acabado", "motor", "categoria", "color", "codigo_color",
    "vin", "vin_corto", "matricula", "cliente", "telefono", "observaciones",
    "ubicacion", "plaza", "estado",
]


class VehicleBody(BaseModel):
    marca: str = "BMW"
    modelo: str = ""
    acabado: str = ""
    motor: str = ""
    categoria: str = ""
    color: str = ""
    codigo_color: str = ""
    vin: str = ""
    vin_corto: str = ""
    matricula: str = ""
    cliente: str = ""
    telefono: str = ""
    observaciones: str = ""
    ubicacion: str = "Stock"
    plaza: str = ""
    estado: str = "Disponible"


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@vehicles_router.get("/vehicles")
async def list_vehicles(
    search: Optional[str] = None,
    ubicacion: Optional[str] = None,
    estado: Optional[str] = None,
    categoria: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if ubicacion:
        query["ubicacion"] = ubicacion
    if estado:
        query["estado"] = estado
    if categoria:
        query["categoria"] = categoria
    if search:
        rx = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"modelo": rx}, {"vin": rx}, {"vin_corto": rx},
            {"matricula": rx}, {"cliente": rx}, {"color": rx}, {"plaza": rx},
        ]
    direction = -1 if order == "desc" else 1
    cursor = db.vehicles.find(query).sort(sort_by, direction)
    return [clean(d) async for d in cursor]


@vehicles_router.get("/vehicles/stats")
async def stats(user: dict = Depends(get_current_user)):
    total = await db.vehicles.count_documents({})

    async def group(field: str):
        pipeline = [{"$group": {"_id": f"${field}", "count": {"$sum": 1}}}]
        return {(d["_id"] or "Sin definir"): d["count"] async for d in db.vehicles.aggregate(pipeline)}

    by_ubicacion = await group("ubicacion")
    by_estado = await group("estado")
    by_categoria = await group("categoria")
    recientes_cursor = db.vehicles.find({}).sort("created_at", -1).limit(5)
    recientes = [clean(d) async for d in recientes_cursor]
    return {
        "total": total,
        "por_ubicacion": by_ubicacion,
        "por_estado": by_estado,
        "por_categoria": by_categoria,
        "recientes": recientes,
    }


@vehicles_router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    doc = await db.vehicles.find_one({"id": vehicle_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return clean(doc)


@vehicles_router.post("/vehicles")
async def create_vehicle(body: VehicleBody, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    if doc.get("vin") and not doc.get("vin_corto"):
        doc["vin_corto"] = doc["vin"][-7:]
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.vehicles.insert_one(doc)
    return clean(doc)


@vehicles_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, body: VehicleBody, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    if doc.get("vin") and not doc.get("vin_corto"):
        doc["vin_corto"] = doc["vin"][-7:]
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.vehicles.find_one_and_update(
        {"id": vehicle_id}, {"$set": doc}, return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return clean(res)


@vehicles_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    res = await db.vehicles.delete_one({"id": vehicle_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return {"ok": True}


class VinScanBody(BaseModel):
    image_base64: str


@vehicles_router.post("/vehicles/scan-vin")
async def scan_vin(body: VinScanBody, user: dict = Depends(get_current_user)):
    img = body.image_base64
    if "," in img and img.strip().startswith("data:"):
        img = img.split(",", 1)[1]
    return await extract_vin_from_image(img)


# ---------- Import / Export ----------

def _norm_row(row: dict) -> dict:
    doc = {f: str(row.get(f, "") or "").strip() for f in FIELDS}
    if not doc["marca"]:
        doc["marca"] = "BMW"
    if not doc["ubicacion"]:
        doc["ubicacion"] = "Stock"
    if not doc["estado"]:
        doc["estado"] = "Disponible"
    if doc["vin"] and not doc["vin_corto"]:
        doc["vin_corto"] = doc["vin"][-7:]
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    return doc


@vehicles_router.post("/vehicles/import")
async def import_vehicles(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    name = (file.filename or "").lower()
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=False)
        else:
            df = pd.read_excel(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {e}")
    df.columns = [str(c).strip().lower() for c in df.columns]
    df = df.fillna("")
    docs = [_norm_row(r) for r in df.to_dict(orient="records")]
    if docs:
        await db.vehicles.insert_many(docs)
    return {"imported": len(docs)}


def _dataframe() -> pd.DataFrame:
    return pd.DataFrame(columns=FIELDS)


@vehicles_router.get("/vehicles/export/{fmt}")
async def export_vehicles(fmt: str, user: dict = Depends(get_current_user)):
    rows = [clean(d) async for d in db.vehicles.find({})]
    data = [{f: r.get(f, "") for f in FIELDS} for r in rows]
    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(data)
        out = io.BytesIO(buf.getvalue().encode("utf-8-sig"))
        return StreamingResponse(out, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=stock_bmw.csv"})
    else:
        df = pd.DataFrame(data, columns=FIELDS) if data else _dataframe()
        out = io.BytesIO()
        with pd.ExcelWriter(out, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Stock")
        out.seek(0)
        return StreamingResponse(
            out,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=stock_bmw.xlsx"},
        )


@vehicles_router.get("/vehicles/template/{fmt}")
async def download_template(fmt: str, user: dict = Depends(get_current_user)):
    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(FIELDS)
        out = io.BytesIO(buf.getvalue().encode("utf-8-sig"))
        return StreamingResponse(out, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=plantilla_stock.csv"})
    df = _dataframe()
    out = io.BytesIO()
    with pd.ExcelWriter(out, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Stock")
    out.seek(0)
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_stock.xlsx"},
    )
