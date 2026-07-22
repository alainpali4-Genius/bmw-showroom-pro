from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import db
from auth import get_current_user

entregas_router = APIRouter(prefix="/api", tags=["entregas"])

ESTADOS_ENTREGA = ["Pendiente", "En preparación", "Listo para entregar", "Entregado"]

VEHICLE_FIELDS = [
    "marca", "modelo", "acabado", "motor", "categoria", "color", "codigo_color",
    "vin", "vin_corto", "matricula", "cliente", "telefono", "observaciones",
]


def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _merge(vehicle: dict, entrega: dict) -> dict:
    item = {f: vehicle.get(f, "") for f in VEHICLE_FIELDS}
    item["id"] = vehicle["id"]
    item["vehicle_id"] = vehicle["id"]
    item["estado_preparacion"] = entrega.get("estado_preparacion", "Pendiente")
    item["fecha_entrega"] = entrega.get("fecha_entrega", "")
    item["hora_entrega"] = entrega.get("hora_entrega", "")
    item["comercial"] = entrega.get("comercial", "")
    return item


class EntregaUpdate(BaseModel):
    estado_preparacion: Optional[str] = None
    fecha_entrega: Optional[str] = None
    hora_entrega: Optional[str] = None
    comercial: Optional[str] = None
    cliente: Optional[str] = None
    telefono: Optional[str] = None
    observaciones: Optional[str] = None


@entregas_router.get("/entregas")
async def list_entregas(user: dict = Depends(get_current_user)):
    vehicles = [_clean(v) async for v in db.vehicles.find({"ubicacion": "Entrega"})]
    items = []
    for v in vehicles:
        entrega = await db.entregas.find_one({"vehicle_id": v["id"]})
        if entrega is None:
            entrega = {
                "vehicle_id": v["id"],
                "estado_preparacion": "Pendiente",
                "fecha_entrega": "",
                "hora_entrega": "",
                "comercial": "",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.entregas.insert_one(dict(entrega))
        items.append(_merge(v, entrega))
    return items


@entregas_router.put("/entregas/{vehicle_id}")
async def update_entrega(vehicle_id: str, body: EntregaUpdate, user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    data = body.model_dump(exclude_none=True)
    if "estado_preparacion" in data and data["estado_preparacion"] not in ESTADOS_ENTREGA:
        raise HTTPException(status_code=400, detail="Estado de preparación no válido")

    entrega_fields = {k: data[k] for k in ["estado_preparacion", "fecha_entrega", "hora_entrega", "comercial"] if k in data}
    vehicle_patch = {k: data[k] for k in ["cliente", "telefono", "observaciones"] if k in data}

    if entrega_fields:
        entrega_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.entregas.update_one({"vehicle_id": vehicle_id}, {"$set": entrega_fields}, upsert=True)
    if vehicle_patch:
        await db.vehicles.update_one({"id": vehicle_id}, {"$set": vehicle_patch})

    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    entrega = await db.entregas.find_one({"vehicle_id": vehicle_id}) or {}
    return _merge(_clean(vehicle), entrega)
