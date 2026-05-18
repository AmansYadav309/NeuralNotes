import asyncio
import httpx

async def test_diagram():
    url = "http://localhost:8000/generate-diagram"
    payload = {
        "content": "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. The process happens in chloroplasts.",
        "diagram_type": "flowchart",
        "topic": "Photosynthesis"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30.0)
            print(f"Status: {resp.status_code}")
            print(f"Response text: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_diagram())
