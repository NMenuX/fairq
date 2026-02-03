from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import health, token, queue, counter, metrics, auth, otp

app = FastAPI(title="FairQ Backend")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(token.router)
app.include_router(queue.router)
app.include_router(counter.router)
app.include_router(metrics.router)
app.include_router(auth.router)
app.include_router(otp.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
