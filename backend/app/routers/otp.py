"""OTP Router for phone verification."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import sms


router = APIRouter(prefix="/otp", tags=["otp"])


class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str


@router.post("/send")
def send_otp(request: SendOTPRequest) -> dict:
    """Send OTP to phone number."""
    phone = request.phone.strip()
    
    if not phone or len(phone) < 9:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    result = sms.send_otp(phone)
    return result


@router.post("/verify")
def verify_otp(request: VerifyOTPRequest) -> dict:
    """Verify OTP."""
    phone = request.phone.strip()
    otp = request.otp.strip()
    
    if not phone or not otp:
        raise HTTPException(status_code=400, detail="Phone and OTP are required")
    
    result = sms.verify_otp(phone, otp)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result
