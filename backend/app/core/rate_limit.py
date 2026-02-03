"""
Rate limiting middleware for API protection.
Implements IP-based rate limiting with configurable limits per endpoint type.
"""
import time
from collections import defaultdict
from typing import Callable
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware that tracks requests per IP address.
    
    Different rate limits are applied based on endpoint type:
    - OTP endpoints: Strictest (prevent SMS spam)
    - Auth endpoints: Strict (prevent brute force)
    - Public endpoints: Standard limit
    """
    
    def __init__(self, app):
        super().__init__(app)
        # Format: {ip: {endpoint_type: [(timestamp, count)]}}
        self._requests: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
        self._window_seconds = 60  # 1 minute window
    
    def _get_endpoint_type(self, path: str) -> str:
        """Categorize endpoint for rate limiting."""
        if "/otp" in path:
            return "otp"
        elif "/auth" in path:
            return "auth"
        else:
            return "public"
    
    def _get_rate_limit(self, endpoint_type: str) -> int:
        """Get rate limit for endpoint type."""
        limits = {
            "otp": settings.rate_limit_otp,
            "auth": settings.rate_limit_auth,
            "public": settings.rate_limit_public,
        }
        return limits.get(endpoint_type, settings.rate_limit_public)
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address.
        Handles X-Forwarded-For header for proxied requests.
        """
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _is_rate_limited(self, ip: str, endpoint_type: str) -> tuple[bool, int, int]:
        """
        Check if IP is rate limited for endpoint type.
        
        Returns:
            (is_limited, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        limit = self._get_rate_limit(endpoint_type)
        window = self._window_seconds
        
        # Clean old entries
        self._requests[ip][endpoint_type] = [
            ts for ts in self._requests[ip][endpoint_type]
            if now - ts < window
        ]
        
        current_count = len(self._requests[ip][endpoint_type])
        remaining = max(0, limit - current_count)
        
        if current_count >= limit:
            # Calculate retry-after (time until oldest request expires)
            oldest = min(self._requests[ip][endpoint_type]) if self._requests[ip][endpoint_type] else now
            retry_after = int(window - (now - oldest)) + 1
            return True, 0, retry_after
        
        # Record this request
        self._requests[ip][endpoint_type].append(now)
        return False, remaining - 1, 0
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request with rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)
        
        ip = self._get_client_ip(request)
        endpoint_type = self._get_endpoint_type(request.url.path)
        
        is_limited, remaining, retry_after = self._is_rate_limited(ip, endpoint_type)
        
        if is_limited:
            # Return 429 Too Many Requests with helpful headers
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self._get_rate_limit(endpoint_type)),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after)
                }
            )
        
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(self._get_rate_limit(endpoint_type))
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
