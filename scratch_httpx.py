import httpx

headers = {
    "Authorization": "Bearer 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"
}

try:
    response = httpx.get("https://api.groq.com/openai/v1/models", headers=headers)
    response.raise_for_status()
    models = response.json().get("data", [])
    print([m["id"] for m in models])
except Exception as e:
    print(f"Error: {e}")
