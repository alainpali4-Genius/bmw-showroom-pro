from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import client, db
from auth import auth_router, seed_admin
from vehicles import vehicles_router
from plano import plano_router, register_plano_ws
from entregas import entregas_router

app = FastAPI(title="BMW Momentum Showroom API")

app.include_router(auth_router)
app.include_router(vehicles_router)
app.include_router(plano_router)
app.include_router(entregas_router)
register_plano_ws(app)


@app.get("/api/")
async def root():
    return {"message": "BMW Momentum Showroom API"}


origins = [os.environ.get("FRONTEND_URL", "http://localhost:3000")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await seed_admin()
    await db.vehicles.create_index("id", unique=True)
    logger.info("BMW Momentum Showroom API listo")


@app.on_event("shutdown")
async def shutdown():
    client.close()
