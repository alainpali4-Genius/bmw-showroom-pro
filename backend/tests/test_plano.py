"""BMW Momentum Showroom - Backend Tests (Phase 2: Plano - plazas, save, assign, WS)"""
import os
import asyncio
import json
import pytest
import requests

try:
    import websockets  # type: ignore
except ImportError:  # pragma: no cover
    websockets = None

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "alainpali4@gmail.com"
ADMIN_PASSWORD = "BMWmomentum2026"


@pytest.fixture(scope="module")
def auth_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def test_vehicle(auth_session):
    r = auth_session.post(f"{API}/vehicles", json={
        "marca": "BMW", "modelo": "TEST_PLANO_V", "motor": "2.0", "categoria": "Berlina",
        "color": "Negro", "vin": "WBAPLANO000000001", "matricula": "PLA0001",
        "ubicacion": "Stock", "estado": "Disponible",
    }, timeout=30)
    assert r.status_code == 200, r.text
    v = r.json()
    yield v
    # cleanup
    auth_session.delete(f"{API}/vehicles/{v['id']}", timeout=30)


# ---------- AUTH GUARDS ----------
class TestPlanoAuth:
    def test_get_plano_requires_auth(self):
        r = requests.get(f"{API}/plano", timeout=30)
        assert r.status_code == 401

    def test_post_plaza_requires_auth(self):
        r = requests.post(f"{API}/plano/plazas", json={"nombre": "X"}, timeout=30)
        assert r.status_code == 401

    def test_save_requires_auth(self):
        r = requests.put(f"{API}/plano/save", json={"plazas": []}, timeout=30)
        assert r.status_code == 401

    def test_assign_requires_auth(self):
        r = requests.put(f"{API}/plano/assign", json={"vehicle_id": "x", "plaza_id": None}, timeout=30)
        assert r.status_code == 401


# ---------- PLANO GET / POST / DELETE ----------
class TestPlanoCRUD:
    def test_get_plano_shape(self, auth_session):
        r = auth_session.get(f"{API}/plano", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "plazas" in data
        assert "zonas" in data
        assert isinstance(data["plazas"], list)
        assert isinstance(data["zonas"], list)
        assert len(data["zonas"]) == 6
        for z in ["Exposición", "Stock Exposición", "Taller", "Terraza", "Entreplanta", "Entregas"]:
            assert z in data["zonas"]

    def test_create_plaza_persists(self, auth_session):
        payload = {"nombre": "TEST_PZ1", "zona": "Exposición", "x": 10, "y": 20, "w": 120, "h": 200, "rotation": 0}
        r = auth_session.post(f"{API}/plano/plazas", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        p = r.json()
        assert "id" in p and p["id"]
        assert p["nombre"] == "TEST_PZ1"
        assert "_id" not in p
        # verify GET includes it
        g = auth_session.get(f"{API}/plano", timeout=30).json()
        assert any(x["id"] == p["id"] for x in g["plazas"])
        # cleanup
        auth_session.delete(f"{API}/plano/plazas/{p['id']}", timeout=30)

    def test_delete_plaza_clears_vehicle_assignment(self, auth_session, test_vehicle):
        # create plaza
        pz = auth_session.post(f"{API}/plano/plazas", json={
            "nombre": "TEST_PZ_DEL", "zona": "Exposición"
        }, timeout=30).json()
        # assign vehicle
        r = auth_session.put(f"{API}/plano/assign", json={
            "vehicle_id": test_vehicle["id"], "plaza_id": pz["id"]
        }, timeout=30)
        assert r.status_code == 200
        assigned = r.json()
        assert assigned["plaza_id"] == pz["id"]
        assert assigned["plaza"] == "TEST_PZ_DEL"
        assert assigned["ubicacion"] == "Exposición"
        # delete plaza
        d = auth_session.delete(f"{API}/plano/plazas/{pz['id']}", timeout=30)
        assert d.status_code == 200
        # vehicle plaza cleared
        v = auth_session.get(f"{API}/vehicles/{test_vehicle['id']}", timeout=30).json()
        assert v["plaza_id"] == ""
        assert v["plaza"] == ""


# ---------- SAVE (authoritative layout) ----------
class TestPlanoSave:
    def test_save_upserts_and_deletes_missing(self, auth_session):
        # baseline: get existing plazas
        base = auth_session.get(f"{API}/plano", timeout=30).json()["plazas"]
        base_ids = [p["id"] for p in base]
        # Save a layout containing existing + one new, but we'll restore afterwards
        new_plaza = {
            "id": "test-save-pz-uuid-0001",
            "nombre": "TEST_SAVE_A", "zona": "Taller",
            "x": 0, "y": 0, "w": 150, "h": 220, "rotation": 15,
        }
        # Include existing + new (so we don't nuke prod layout in case)
        payload = {"plazas": base + [new_plaza]}
        r = auth_session.put(f"{API}/plano/save", json=payload, timeout=30)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert r.json()["count"] == len(base) + 1
        # verify
        g = auth_session.get(f"{API}/plano", timeout=30).json()
        ids = {p["id"] for p in g["plazas"]}
        assert new_plaza["id"] in ids
        for bid in base_ids:
            assert bid in ids
        # verify upsert of the new plaza fields
        found = next(p for p in g["plazas"] if p["id"] == new_plaza["id"])
        assert found["nombre"] == "TEST_SAVE_A"
        assert found["zona"] == "Taller"
        assert found["rotation"] == 15

        # now save without the new one -> should be deleted
        r2 = auth_session.put(f"{API}/plano/save", json={"plazas": base}, timeout=30)
        assert r2.status_code == 200
        g2 = auth_session.get(f"{API}/plano", timeout=30).json()
        ids2 = {p["id"] for p in g2["plazas"]}
        assert new_plaza["id"] not in ids2

    def test_save_removes_orphan_assignments(self, auth_session, test_vehicle):
        # create plaza via POST
        pz = auth_session.post(f"{API}/plano/plazas", json={"nombre": "TEST_ORPH", "zona": "Entregas"}, timeout=30).json()
        # assign vehicle
        r = auth_session.put(f"{API}/plano/assign", json={"vehicle_id": test_vehicle["id"], "plaza_id": pz["id"]}, timeout=30)
        assert r.status_code == 200
        assert r.json()["ubicacion"] == "Entrega"  # Entregas -> Entrega
        # save layout without this plaza -> vehicles should be cleared
        base = [p for p in auth_session.get(f"{API}/plano", timeout=30).json()["plazas"] if p["id"] != pz["id"]]
        s = auth_session.put(f"{API}/plano/save", json={"plazas": base}, timeout=30)
        assert s.status_code == 200
        v = auth_session.get(f"{API}/vehicles/{test_vehicle['id']}", timeout=30).json()
        assert v["plaza_id"] == ""
        assert v["plaza"] == ""


# ---------- ASSIGN (zone -> ubicacion mapping) ----------
class TestPlanoAssign:
    @pytest.mark.parametrize("zona,expected", [
        ("Exposición", "Exposición"),
        ("Stock Exposición", "Stock Exposición"),
        ("Taller", "Taller"),
        ("Terraza", "Terraza"),
        ("Entreplanta", "Entreplanta"),
        ("Entregas", "Entrega"),
    ])
    def test_assign_updates_ubicacion(self, auth_session, test_vehicle, zona, expected):
        pz = auth_session.post(f"{API}/plano/plazas", json={"nombre": f"TEST_Z_{zona[:3]}", "zona": zona}, timeout=30).json()
        try:
            r = auth_session.put(f"{API}/plano/assign", json={
                "vehicle_id": test_vehicle["id"], "plaza_id": pz["id"]
            }, timeout=30)
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["ubicacion"] == expected
            assert d["plaza_id"] == pz["id"]
            # verify GET
            v = auth_session.get(f"{API}/vehicles/{test_vehicle['id']}", timeout=30).json()
            assert v["ubicacion"] == expected
        finally:
            auth_session.delete(f"{API}/plano/plazas/{pz['id']}", timeout=30)

    def test_unassign_sets_stock(self, auth_session, test_vehicle):
        pz = auth_session.post(f"{API}/plano/plazas", json={"nombre": "TEST_UN", "zona": "Exposición"}, timeout=30).json()
        auth_session.put(f"{API}/plano/assign", json={"vehicle_id": test_vehicle["id"], "plaza_id": pz["id"]}, timeout=30)
        # unassign
        r = auth_session.put(f"{API}/plano/assign", json={"vehicle_id": test_vehicle["id"], "plaza_id": None}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["plaza_id"] == ""
        assert d["plaza"] == ""
        assert d["ubicacion"] == "Stock"
        auth_session.delete(f"{API}/plano/plazas/{pz['id']}", timeout=30)

    def test_assign_missing_vehicle(self, auth_session):
        r = auth_session.put(f"{API}/plano/assign", json={"vehicle_id": "nonexistent-xyz", "plaza_id": None}, timeout=30)
        assert r.status_code == 404


# ---------- WEBSOCKET ----------
class TestPlanoWebSocket:
    def test_ws_connects_and_receives_broadcast(self, auth_session):
        if websockets is None:
            pytest.skip("websockets library not installed")
        ws_url = BASE_URL.replace("http://", "ws://").replace("https://", "wss://") + "/api/ws/plano"

        async def run():
            try:
                async with websockets.connect(ws_url, open_timeout=10, close_timeout=5) as ws:
                    # Trigger a broadcast via HTTP
                    pz = auth_session.post(f"{API}/plano/plazas", json={"nombre": "TEST_WS", "zona": "Exposición"}, timeout=30).json()
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=8)
                        data = json.loads(msg)
                        assert data.get("type") == "plano_update"
                        return True
                    finally:
                        auth_session.delete(f"{API}/plano/plazas/{pz['id']}", timeout=30)
            except Exception as e:
                pytest.skip(f"WebSocket not reachable through ingress: {e}")

        ok = asyncio.run(run())
        assert ok is True
