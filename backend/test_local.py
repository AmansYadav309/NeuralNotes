import asyncio
import httpx

async def test_concept_map():
    url = "http://localhost:8000/concept-map"
    payload = {
        "context": "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. The process happens in chloroplasts."
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30.0)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_concept_map())
