import httpx
import asyncio
import time

async def test_login():
    async with httpx.AsyncClient() as client:
        print("Waiting for server to start...")
        for _ in range(30):
            try:
                response = await client.post(
                    "http://127.0.0.1:8000/api/auth/login",
                    data={"username": "admin", "password": "admin123"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                print("Login status code:", response.status_code)
                if response.status_code == 200:
                    token = response.json().get("access_token")
                    print("Access token retrieved.")
                    
                    me_res = await client.get(
                        "http://127.0.0.1:8000/api/auth/me",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    print("/me status code:", me_res.status_code)
                    if me_res.status_code == 200:
                        print("/me data:", me_res.json())
                else:
                    print("Login failed:", response.text)
                return
            except httpx.ConnectError:
                await asyncio.sleep(1)
        print("Server never started")

if __name__ == "__main__":
    asyncio.run(test_login())
