import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from db import db
from auth import get_current_user

plano_router = APIRouter(prefix="/api", tags=["plano"])

ZONAS = ["Exposición", "Stock Exposición", "Taller", "Terraza", "Entreplanta", "Entregas"]

ZONE_UBICACION = {
    "Exposición": "Exposición",
    "Stock Exposición": "Stock Exposición",
    "Taller": "Taller",
    "Terraza": "Terraza",
    "Entreplanta": "Entreplanta",
    "Entregas": "Entrega",
}


class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()


def client_id(request: Request) -> str:
    return request.headers.get("x-client-id", "")


class Plaza(BaseModel):
    id: Optional[str] = None
    nombre: str = "P"
    zona: str = "Exposición"
    x: float = 0
    y: float = 0
    w: float = 120
    h: float = 200
    rotation: float = 0


class SaveBody(BaseModel):
    plazas: List[Plaza]


class AssignBody(BaseModel):
    vehicle_id: str
    plaza_id: Optional[str] = None


def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@plano_router.get("/plano")
async def get_plano(user: dict = Depends(get_current_user)):
    plazas = [_clean(p) async for p in db.plazas.find({})]
    return {"plazas": plazas, "zonas": ZONAS}


@plano_router.post("/plano/plazas")
async def create_plaza(body: Plaza, request: Request, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.plazas.insert_one(doc)
    await manager.broadcast({"type": "plano_update", "origin": client_id(request)})
    return _clean(doc)


@plano_router.put("/plano/save")
async def save_plano(body: SaveBody, request: Request, user: dict = Depends(get_current_user)):
    ids = []
    for p in body.plazas:
        pid = p.id or str(uuid.uuid4())
        ids.append(pid)
        doc = p.model_dump()
        doc["id"] = pid
        await db.plazas.update_one({"id": pid}, {"$set": doc}, upsert=True)
    await db.plazas.delete_many({"id": {"$nin": ids}})
    # Limpia asignaciones a plazas eliminadas
    await db.vehicles.update_many(
        {"plaza_id": {"$nin": ids + [""]}},
        {"$set": {"plaza_id": "", "plaza": ""}},
    )
    await manager.broadcast({"type": "plano_update", "origin": client_id(request)})
    return {"ok": True, "count": len(ids)}


@plano_router.delete("/plano/plazas/{plaza_id}")
async def delete_plaza(plaza_id: str, request: Request, user: dict = Depends(get_current_user)):
    await db.plazas.delete_one({"id": plaza_id})
    await db.vehicles.update_many(
        {"plaza_id": plaza_id}, {"$set": {"plaza_id": "", "plaza": ""}}
    )
    await manager.broadcast({"type": "plano_update", "origin": client_id(request)})
    return {"ok": True}


@plano_router.put("/plano/assign")
async def assign_vehicle(body: AssignBody, request: Request, user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": body.vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.plaza_id:
        plaza = await db.plazas.find_one({"id": body.plaza_id})
        if not plaza:
            raise HTTPException(status_code=404, detail="Plaza no encontrada")
        update["plaza_id"] = plaza["id"]
        update["plaza"] = plaza["nombre"]
        update["ubicacion"] = ZONE_UBICACION.get(plaza["zona"], plaza["zona"])
    else:
        update["plaza_id"] = ""
        update["plaza"] = ""
        update["ubicacion"] = "Stock"

    res = await db.vehicles.find_one_and_update(
        {"id": body.vehicle_id}, {"$set": update}, return_document=True
    )
    await manager.broadcast({"type": "plano_update", "origin": client_id(request)})
    return _clean(res)


def register_plano_ws(app):
    @app.websocket("/api/ws/plano")
    async def ws_plano(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
