import asyncio
import aiohttp
import time
import random

async def send_log(session, i):
    levels = ["ERROR", "WARN", "INFO"]
    services = ["payment-service", "auth-service", "inventory-service", "checkout-service"]
    
    # Simulate a sudden spike of errors in payment-service
    if i % 20 == 0:
        level = "ERROR"
        service = "payment-service"
        message = f"Connection timeout to payment gateway: attempt {i}"
    else:
        level = random.choice(levels)
        service = random.choice(services)
        message = f"Routine system event processed for {service}"

    try:
        await session.post("http://localhost:8080/api/v1/logs/ingest",
            json={
                "serviceName": service,
                "level": level,
                "message": message,
                "timestamp": time.time() * 1000
            })
    except Exception as e:
        print(f"Failed: {e}")

async def main():
    async with aiohttp.ClientSession() as session:
        start = time.time()
        print("Starting load test with 5000 logs...")
        await asyncio.gather(*[send_log(session, i) for i in range(5000)])
        elapsed = time.time() - start
        print(f"Sent 5000 logs in {elapsed:.2f}s -> {5000/elapsed:.0f} logs/sec")

if __name__ == "__main__":
    asyncio.run(main())
