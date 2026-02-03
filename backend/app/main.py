"""
FairQ Backend - Main Application Entry Point

Security Features:
- Rate limiting on all endpoints (IP-based)
- CORS configuration (restrict in production)
- Input validation via Pydantic schemas
- JWT authentication for admin endpoints
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.rate_limit import RateLimitMiddleware
from .routers import health, token, queue, counter, metrics, auth, otp

# =============================================================================
# APPLICATION SETUP
# =============================================================================
app = FastAPI(
    title="FairQ Backend",
    description="Fairness-Aware Queue Management System API",
    version="1.0.0",
    # Disable docs in production for security
    # docs_url=None,
    # redoc_url=None,
)

# =============================================================================
# MIDDLEWARE (order matters - first added = outermost)
# =============================================================================

# Rate Limiting - Protects against abuse and DDoS
# Must be added first so it runs before other middleware
app.add_middleware(RateLimitMiddleware)

# CORS - Configure allowed origins
# WARNING: In production, replace ["*"] with specific frontend URLs
# Example: allow_origins=["https://fairq.example.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# =============================================================================
# ROUTERS
# =============================================================================
app.include_router(health.router)
app.include_router(token.router)
app.include_router(queue.router)
app.include_router(counter.router)
app.include_router(metrics.router)
app.include_router(auth.router)
app.include_router(otp.router)


# =============================================================================
# DEVELOPMENT SERVER
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
