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
        # Format: {ip: {endpoint_type: [timestamp1, timestamp2, ...]}}
        self._requests: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
        self._window_seconds = 60  # 1 minute window
        self._cleanup_counter = 0
        self._cleanup_interval = 1000  # Run cleanup every 1000 requests

    def _cleanup_old_ips(self):
        """Remove IPs that haven't made requests in the window period."""
        now = time.time()
        window = self._window_seconds

        # Identify IPs to remove or clean
        ips_to_remove = []
        # Create a copy of keys to iterate safely
        ips = list(self._requests.keys())

        for ip in ips:
            endpoints = self._requests[ip]
            empty_endpoints = []

            for ep_type, timestamps in endpoints.items():
                # Keep only valid timestamps
                # We can assume timestamps are sorted, but let's filter all
                valid_timestamps = [ts for ts in timestamps if now - ts < window]
                if not valid_timestamps:
                    empty_endpoints.append(ep_type)
                else:
                    endpoints[ep_type] = valid_timestamps

            # Remove empty endpoints
            for ep in empty_endpoints:
                del endpoints[ep]

            # If no endpoints left for this IP, mark for removal
            if not endpoints:
                ips_to_remove.append(ip)

        for ip in ips_to_remove:
            del self._requests[ip]
    
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
        # Periodic cleanup to prevent memory leaks
        self._cleanup_counter += 1
        if self._cleanup_counter >= self._cleanup_interval:
            self._cleanup_old_ips()
            self._cleanup_counter = 0

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
