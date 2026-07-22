import os
import json
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

SYSTEM = (
    "Eres un experto en identificación de vehículos BMW a partir del número de bastidor (VIN). "
    "Recibes una foto de una placa/etiqueta de VIN o del propio bastidor. "
    "Extrae el VIN (17 caracteres alfanuméricos, sin las letras I, O, Q) y, si es posible, "
    "deduce marca, modelo, motorización y categoría de carrocería del vehículo BMW. "
    "Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional ni markdown, con las claves: "
    'vin, vin_corto, marca, modelo, motor, categoria. Usa cadena vacía si no puedes determinar un valor. '
    "vin_corto son los últimos 7 caracteres del VIN."
)


async def extract_vin_from_image(image_base64: str) -> dict:
    key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(api_key=key, session_id="vin-ocr", system_message=SYSTEM).with_model("openai", "gpt-4o")
    msg = UserMessage(
        text="Extrae el VIN y los datos del vehículo de esta imagen. Devuelve solo JSON.",
        file_contents=[ImageContent(image_base64=image_base64)],
    )
    raw = await chat.send_message(msg)
    text = raw if isinstance(raw, str) else str(raw)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data = {"vin": "", "vin_corto": "", "marca": "BMW", "modelo": "", "motor": "", "categoria": ""}
    vin = (data.get("vin") or "").upper().strip()
    if vin and not data.get("vin_corto"):
        data["vin_corto"] = vin[-7:]
    if not data.get("marca"):
        data["marca"] = "BMW"
    return {
        "vin": vin,
        "vin_corto": (data.get("vin_corto") or "").upper().strip(),
        "marca": data.get("marca", "BMW"),
        "modelo": data.get("modelo", ""),
        "motor": data.get("motor", ""),
        "categoria": data.get("categoria", ""),
    }
