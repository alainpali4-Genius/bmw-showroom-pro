# Image (VIN OCR) Testing — BMW Momentum Showroom
POST /api/vehicles/scan-vin  body: {"image_base64": "<base64 jpeg/png>"}
Use real photo of a VIN label (JPEG/PNG/WEBP only, non-blank, with text). Returns {vin, vin_corto, marca, modelo, motor, categoria}.
Requires auth cookie. Uses OpenAI gpt-4o via EMERGENT_LLM_KEY.
