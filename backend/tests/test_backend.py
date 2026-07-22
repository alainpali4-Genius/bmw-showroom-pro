"""BMW Momentum Showroom - Backend Tests (Phase 1: Auth, Vehicles CRUD, Import/Export, VIN OCR)"""
import io
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bmw-showroom-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "alainpali4@gmail.com"
ADMIN_PASSWORD = "BMWmomentum2026"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def auth_session(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return session


# ---------- AUTH ----------
class TestAuth:
    def test_login_success(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "id" in data
        # cookies set
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_me(self, auth_session):
        r = auth_session.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_vehicles_requires_auth(self):
        r = requests.get(f"{API}/vehicles", timeout=30)
        assert r.status_code == 401


# ---------- VEHICLES CRUD ----------
class TestVehiclesCRUD:
    created_id = None

    def test_create_vehicle_autofills_vin_corto(self, auth_session):
        vin = "WBAJC5C50KWW12345"
        payload = {
            "marca": "BMW", "modelo": "TEST_320i", "motor": "2.0", "categoria": "Berlina",
            "color": "Negro", "vin": vin, "matricula": "TEST1234",
            "ubicacion": "Stock", "estado": "Disponible",
        }
        r = auth_session.post(f"{API}/vehicles", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["vin_corto"] == vin[-7:]
        assert "id" in data
        assert "_id" not in data
        TestVehiclesCRUD.created_id = data["id"]

    def test_get_vehicle(self, auth_session):
        vid = TestVehiclesCRUD.created_id
        r = auth_session.get(f"{API}/vehicles/{vid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["modelo"] == "TEST_320i"

    def test_list_with_search(self, auth_session):
        r = auth_session.get(f"{API}/vehicles", params={"search": "TEST_320i"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert any(v["modelo"] == "TEST_320i" for v in rows)

    def test_list_with_filters(self, auth_session):
        r = auth_session.get(f"{API}/vehicles", params={
            "ubicacion": "Stock", "estado": "Disponible", "categoria": "Berlina",
            "sort_by": "created_at", "order": "desc"
        }, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_update_vehicle(self, auth_session):
        vid = TestVehiclesCRUD.created_id
        r = auth_session.put(f"{API}/vehicles/{vid}", json={
            "marca": "BMW", "modelo": "TEST_320i_UPD", "motor": "2.0", "categoria": "Berlina",
            "color": "Blanco", "vin": "WBAJC5C50KWW12345", "matricula": "TEST1234",
            "ubicacion": "Exposición", "estado": "Disponible",
        }, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["modelo"] == "TEST_320i_UPD"
        # verify persistence
        g = auth_session.get(f"{API}/vehicles/{vid}", timeout=30)
        assert g.json()["color"] == "Blanco"

    def test_stats(self, auth_session):
        r = auth_session.get(f"{API}/vehicles/stats", timeout=30)
        assert r.status_code == 200
        data = r.json()
        for key in ["total", "por_ubicacion", "por_estado", "por_categoria", "recientes"]:
            assert key in data
        assert data["total"] >= 1

    def test_delete_vehicle(self, auth_session):
        vid = TestVehiclesCRUD.created_id
        r = auth_session.delete(f"{API}/vehicles/{vid}", timeout=30)
        assert r.status_code == 200
        g = auth_session.get(f"{API}/vehicles/{vid}", timeout=30)
        assert g.status_code == 404


# ---------- EXPORT / TEMPLATE ----------
class TestExport:
    def test_export_csv(self, auth_session):
        r = auth_session.get(f"{API}/vehicles/export/csv", timeout=30)
        assert r.status_code == 200
        assert "csv" in r.headers.get("content-type", "")
        assert b"marca" in r.content[:200]

    def test_export_xlsx(self, auth_session):
        r = auth_session.get(f"{API}/vehicles/export/xlsx", timeout=30)
        assert r.status_code == 200
        assert r.content[:2] == b"PK"  # xlsx is a zip

    def test_template_xlsx(self, auth_session):
        r = auth_session.get(f"{API}/vehicles/template/xlsx", timeout=30)
        assert r.status_code == 200
        assert r.content[:2] == b"PK"


# ---------- IMPORT ----------
class TestImport:
    def test_import_csv(self, auth_session):
        csv_content = (
            "marca,modelo,motor,categoria,color,vin,matricula,ubicacion,estado\n"
            "BMW,TEST_IMP_M340i,3.0,Berlina,Azul,WBA00000000000001,TESTIMP1,Stock,Disponible\n"
            "BMW,TEST_IMP_X5,3.0,SUV,Rojo,WBA00000000000002,TESTIMP2,Exposición,Reservado\n"
        )
        files = {"file": ("test.csv", csv_content.encode("utf-8"), "text/csv")}
        r = auth_session.post(f"{API}/vehicles/import", files=files, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["imported"] == 2
        # verify persisted
        g = auth_session.get(f"{API}/vehicles", params={"search": "TEST_IMP"}, timeout=30)
        rows = g.json()
        assert len(rows) >= 2
        # cleanup
        for row in rows:
            if row.get("modelo", "").startswith("TEST_IMP"):
                auth_session.delete(f"{API}/vehicles/{row['id']}", timeout=30)


# ---------- VIN OCR ----------
class TestVinOCR:
    def test_scan_vin(self, auth_session):
        # Generate a real image containing a VIN text label
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new("RGB", (600, 200), "white")
        d = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        except Exception:
            font = ImageFont.load_default()
        d.text((20, 80), "VIN: WBAJC5C50KWW12345", fill="black", font=font)
        buf = io.BytesIO(); img.save(buf, "PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        r = auth_session.post(f"{API}/vehicles/scan-vin", json={"image_base64": b64}, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["vin", "vin_corto", "marca", "modelo", "motor", "categoria"]:
            assert key in data
