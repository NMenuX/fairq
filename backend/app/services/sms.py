"""
Mock SMS service for development/prototype.
In production, replace with Twilio or another SMS provider.
"""
import re
import random
import string
from datetime import datetime, timedelta


# In-memory OTP storage (use Redis or similar in production)
_otp_store: dict[str, dict] = {}


def _normalize_phone(phone: str) -> str:
    """Normalize phone number by removing spaces, dashes, and whitespace."""
    return re.sub(r'[\s\-]', '', phone.strip())


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))


def send_otp(phone: str) -> dict:
    """
    Send OTP to phone number.
    Returns the OTP for testing (in production, only return success/failure).
    """
    phone = _normalize_phone(phone)
    otp = generate_otp()
    expiry = datetime.now() + timedelta(minutes=5)
    
    _otp_store[phone] = {
        "otp": otp,
        "expiry": expiry,
        "verified": False
    }
    
    # Mock SMS - just log to console
    print(f"[SMS] OTP {otp} sent to {phone} (expires at {expiry.strftime('%H:%M:%S')})")
    
    return {"success": True, "message": f"OTP sent to {phone}", "otp": otp}  # Remove 'otp' in production


def verify_otp(phone: str, otp: str) -> dict:
    """Verify OTP for a phone number."""
    phone = _normalize_phone(phone)
    if phone not in _otp_store:
        return {"success": False, "message": "No OTP found for this phone number"}
    
    stored = _otp_store[phone]
    
    if datetime.now() > stored["expiry"]:
        del _otp_store[phone]
        return {"success": False, "message": "OTP has expired"}
    
    if stored["otp"] != otp:
        return {"success": False, "message": "Invalid OTP"}
    
    # Mark as verified
    stored["verified"] = True
    print(f"[SMS] OTP verified for {phone}")
    
    return {"success": True, "message": "OTP verified successfully"}


def is_phone_verified(phone: str) -> bool:
    """Check if phone number has been verified."""
    phone = _normalize_phone(phone)
    if phone not in _otp_store:
        return False
    return _otp_store[phone].get("verified", False)


def clear_otp(phone: str):
    """Clear OTP data for a phone number."""
    phone = _normalize_phone(phone)
    if phone in _otp_store:
        del _otp_store[phone]


def send_token_notification(phone: str, token_number: str, service_type: str) -> dict:
    """Send SMS notification when token is created."""
    message = f"Your token number is {token_number} for {service_type}. Please wait for your turn."
    
    # Mock SMS - just log to console
    print(f"[SMS] To {phone}: {message}")
    
    return {"success": True, "message": "Notification sent"}


def send_called_notification(phone: str, token_number: str, counter_name: str = "the counter") -> dict:
    """Send SMS notification when token is called."""
    message = f"Your token {token_number} is now being called! Please proceed to {counter_name}."
    
    # Mock SMS - just log to console
    print(f"[SMS] To {phone}: {message}")
    
    return {"success": True, "message": "Notification sent"}
