"""BMW Momentum Showroom - Backend Tests (Phase 3: Entregas)"""
import os
import pytest
import requests

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
    """Create a TEST_ vehicle located in 'Entrega' so it auto-provisions an entrega record."""
    payload = {
        "marca": "BMW", "modelo": "TEST_ENTREGA_320d", "motor": "2.0d", "categoria": "Berlina",
        "color": "Negro", "vin": "WBAJC5C50TESTENT1", "matricula": "TESTENT1",
        "ubicacion": "Entrega", "estado": "Reservado",
        "cliente": "TEST Cliente", "telefono": "600111222", "observaciones": "TEST obs",
    }
    r = auth_session.post(f"{API}/vehicles", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    vid = r.json()["id"]
    yield vid
    # cleanup
    try:
        auth_session.delete(f"{API}/vehicles/{vid}", timeout=30)
    except Exception:
        pass


class TestEntregasAuth:
    def test_requires_auth_get(self):
        r = requests.get(f"{API}/entregas", timeout=30)
        assert r.status_code == 401

    def test_requires_auth_put(self):
        r = requests.put(f"{API}/entregas/fake-id", json={"estado_preparacion": "Pendiente"}, timeout=30)
        assert r.status_code == 401


class TestEntregasList:
    def test_list_returns_only_entrega_vehicles(self, auth_session, test_vehicle):
        r = auth_session.get(f"{API}/entregas", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [e["id"] for e in data]
        assert test_vehicle in ids
        # each has required fields
        item = next(e for e in data if e["id"] == test_vehicle)
        for k in ["marca", "modelo", "vin", "vin_corto", "estado_preparacion",
                  "fecha_entrega", "hora_entrega", "comercial", "cliente", "telefono", "observaciones"]:
            assert k in item
        # auto-provisioned as Pendiente
        assert item["estado_preparacion"] == "Pendiente"
        # no mongo _id leaked
        assert "_id" not in item

    def test_auto_provision_persists(self, auth_session, test_vehicle):
        # second call should return the same (already provisioned) record
        r = auth_session.get(f"{API}/entregas", timeout=30)
        assert r.status_code == 200
        item = next(e for e in r.json() if e["id"] == test_vehicle)
        assert item["estado_preparacion"] in ["Pendiente", "En preparación", "Listo para entregar", "Entregado"]


class TestEntregasUpdate:
    def test_update_estado_and_fields(self, auth_session, test_vehicle):
        payload = {
            "estado_preparacion": "En preparación",
            "fecha_entrega": "2026-07-25",
            "hora_entrega": "10:30",
            "comercial": "TEST Comercial",
            "cliente": "TEST Cliente Updated",
            "telefono": "600999888",
            "observaciones": "TEST obs updated",
        }
        r = auth_session.put(f"{API}/entregas/{test_vehicle}", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["estado_preparacion"] == "En preparación"
        assert data["fecha_entrega"] == "2026-07-25"
        assert data["hora_entrega"] == "10:30"
        assert data["comercial"] == "TEST Comercial"
        assert data["cliente"] == "TEST Cliente Updated"
        assert data["telefono"] == "600999888"
        assert data["observaciones"] == "TEST obs updated"

        # verify GET reflects the update
        g = auth_session.get(f"{API}/entregas", timeout=30)
        item = next(e for e in g.json() if e["id"] == test_vehicle)
        assert item["estado_preparacion"] == "En preparación"
        assert item["fecha_entrega"] == "2026-07-25"
        assert item["cliente"] == "TEST Cliente Updated"

        # cliente/telefono/observaciones stored in vehicle
        v = auth_session.get(f"{API}/vehicles/{test_vehicle}", timeout=30).json()
        assert v["cliente"] == "TEST Cliente Updated"
        assert v["telefono"] == "600999888"
        assert v["observaciones"] == "TEST obs updated"

    def test_update_invalid_estado(self, auth_session, test_vehicle):
        r = auth_session.put(f"{API}/entregas/{test_vehicle}", json={"estado_preparacion": "INVALID"}, timeout=30)
        assert r.status_code == 400

    def test_update_nonexistent(self, auth_session):
        r = auth_session.put(f"{API}/entregas/does-not-exist", json={"estado_preparacion": "Pendiente"}, timeout=30)
        assert r.status_code == 404


class TestEntregasAutoAppearDisappear:
    def test_appears_and_disappears_based_on_ubicacion(self, auth_session):
        # Create vehicle in Stock
        payload = {
            "marca": "BMW", "modelo": "TEST_ENTREGA_MOVE", "motor": "3.0", "categoria": "SUV",
            "color": "Blanco", "vin": "WBAJC5C50TESTMOV1", "matricula": "TESTMOV1",
            "ubicacion": "Stock", "estado": "Disponible",
        }
        r = auth_session.post(f"{API}/vehicles", json=payload, timeout=30)
        assert r.status_code == 200
        vid = r.json()["id"]
        try:
            # Not in entregas
            lst = auth_session.get(f"{API}/entregas", timeout=30).json()
            assert vid not in [e["id"] for e in lst]

            # Move to Entrega
            v = auth_session.get(f"{API}/vehicles/{vid}", timeout=30).json()
            v["ubicacion"] = "Entrega"
            u = auth_session.put(f"{API}/vehicles/{vid}", json=v, timeout=30)
            assert u.status_code == 200
            lst = auth_session.get(f"{API}/entregas", timeout=30).json()
            assert vid in [e["id"] for e in lst]

            # Move back to Stock -> disappears
            v = auth_session.get(f"{API}/vehicles/{vid}", timeout=30).json()
            v["ubicacion"] = "Stock"
            u = auth_session.put(f"{API}/vehicles/{vid}", json=v, timeout=30)
            assert u.status_code == 200
            lst = auth_session.get(f"{API}/entregas", timeout=30).json()
            assert vid not in [e["id"] for e in lst]
        finally:
            auth_session.delete(f"{API}/vehicles/{vid}", timeout=30)
