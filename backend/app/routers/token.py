from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..schemas.token import TokenCreate, TokenOut
from ..services.repo import TokenRepo
from ..services.runtime import get_db
from ..services import nic, sms
from ..db import models
from ..services.ewt import calculate_ewt_for_token


router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.post("/", response_model=TokenOut)
def create_token(payload: TokenCreate, db: Session = Depends(get_db)) -> TokenOut:
    repo = TokenRepo(db)
    
    # Auto-calculate age and gender from NIC
    age = payload.age
    gender = payload.gender
    if payload.nic:
        calculated_age = nic.extract_age_from_nic(payload.nic)
        calculated_gender = nic.extract_gender_from_nic(payload.nic)
        if calculated_age:
            age = calculated_age
        if calculated_gender:
            gender = calculated_gender
    
    # Verify OTP if phone is provided
    if payload.phone:
        if not sms.is_phone_verified(payload.phone):
            raise HTTPException(status_code=400, detail="Phone number not verified. Please verify OTP first.")
    
    # Create token
    token = repo.create(
        number="TEMP", 
        service_type=payload.service_type,
        nic=payload.nic, 
        age=age, 
        gender=gender,
        phone=payload.phone,
        language=payload.language,
        otp_verified=sms.is_phone_verified(payload.phone) if payload.phone else False,
        disability=payload.disability, 
        language_barrier=payload.language_barrier,
        vulnerability_score=payload.vulnerability_score
    )
    token.number = f"T-{token.id}"
    db.commit()
    
    # 3. Calculate EWT (Assume conservative historical average of 5 mins per token)
    est_wait = calculate_ewt_for_token(db, token)
    
    # Send SMS notification
    if payload.phone:
        sms.send_token_notification(payload.phone, token.number, token.service_type)
        sms.clear_otp(payload.phone)  # Clear OTP after successful token creation
        
    # We create a dictionary so we can inject estimated_wait_minutes without changing the DB schema
    out_dict = TokenOut.model_validate(token).model_dump()
    out_dict["estimated_wait_minutes"] = est_wait
    
    return TokenOut(**out_dict)


@router.post("/{token_id}/call")
def call_token(
    token_id: int, 
    counter_id: int | None = None, 
    db: Session = Depends(get_db)
) -> dict[str, str]:
    # Atomic claim to prevent two counters calling same token concurrently.
    q = db.query(models.Token).filter(
        models.Token.id == token_id,
        models.Token.status == "WAITING",
    )
    if counter_id is None:
        # If caller didn't specify a counter, only allow truly unassigned tokens.
        q = q.filter(models.Token.counter_id.is_(None))
    else:
        # Allow calling tokens assigned to this counter or unassigned.
        q = q.filter(or_(models.Token.counter_id.is_(None), models.Token.counter_id == counter_id))

    updated_rows = q.update(
        {
            models.Token.status: "CALLED",
            models.Token.counter_id: counter_id,
            models.Token.updated_at: datetime.now(timezone.utc),
        },
        synchronize_session=False,
    )
    if updated_rows == 0:
        token = db.get(models.Token, token_id)
        if not token:
            raise HTTPException(status_code=404, detail="Token not found")
        raise HTTPException(status_code=409, detail="Token already taken or not waiting")

    token = db.get(models.Token, token_id)
    counter_name = "the counter"
    if counter_id:
        counter = db.get(models.Counter, counter_id)
        if counter:
            counter_name = counter.name
    db.commit()
    
    # Send SMS notification when token is called
    if token.phone:
        sms.send_called_notification(token.phone, token.number, counter_name)
    
    return {"status": "ok"}


@router.post("/{token_id}/start")
def start_serving(token_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if token.status not in {"CALLED", "WAITING"}:
        raise HTTPException(status_code=400, detail="Token must be WAITING or CALLED to start")
    token.status = "SERVING"
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.post("/{token_id}/complete")
def complete_token(token_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if token.status != "SERVING":
        raise HTTPException(status_code=400, detail="Only SERVING tokens can be completed")
    token.status = "COMPLETED"
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.post("/{token_id}/cancel")
def cancel_token(token_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if token.status in {"COMPLETED", "CANCELLED"}:
        raise HTTPException(status_code=400, detail="Cannot cancel finalised token")
    token.status = "CANCELLED"
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.post("/{token_id}/hold")
def hold_token(token_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    """Put a SERVING token on hold (e.g., customer needs to step away temporarily)."""
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if token.status != "SERVING":
        raise HTTPException(status_code=400, detail="Only SERVING tokens can be put on hold")
    token.status = "ON_HOLD"
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "message": f"Token {token.number} is now on hold"}


@router.post("/{token_id}/resume")
def resume_token(token_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    """Resume an ON_HOLD token back to SERVING."""
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if token.status != "ON_HOLD":
        raise HTTPException(status_code=400, detail="Only ON_HOLD tokens can be resumed")
    token.status = "SERVING"
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "message": f"Token {token.number} resumed serving"}


@router.put("/{token_id}/notes")
def update_notes(token_id: int, note_data: dict, db: Session = Depends(get_db)) -> dict[str, str]:
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    notes = note_data.get("notes")
    if notes is not None:
        token.notes = notes
        token.updated_at = datetime.now(timezone.utc)
        db.commit()
    
    return {"status": "ok"}


@router.put("/{token_id}/reset-wait")
def reset_token_to_waiting(token_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    # Allow resetting from CALLED or CANCELLED (or even SERVING if mistakenly started)
    if token.status not in {"CALLED", "CANCELLED", "SERVING", "COMPLETED"}:
        raise HTTPException(status_code=400, detail="Token is already waiting or in invalid state")
    
    token.status = "WAITING"
    token.counter_id = None
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"status": "ok", "message": f"Token {token.number} returned to queue"}


@router.post("/{token_id}/transfer")
def transfer_token(
    token_id: int, 
    payload: dict,
    db: Session = Depends(get_db)
) -> dict[str, str]:
    token = db.get(models.Token, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    target_counter_id = payload.get("target_counter_id")
    
    if target_counter_id:
        # Verify target counter exists
        counter = db.get(models.Counter, target_counter_id)
        if not counter:
             raise HTTPException(status_code=404, detail="Target counter not found")
        token.counter_id = target_counter_id
    else:
        # Transfer to general pool
        token.counter_id = None
        
    token.status = "WAITING"
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"status": "ok", "message": "Token transferred"}


@router.get("/all", response_model=dict)
def get_all_tokens(db: Session = Depends(get_db)) -> dict:
    tokens = db.query(models.Token).order_by(models.Token.id.asc()).all()
    
    items = []
    for t in tokens:
        # Calculate dynamic EWT only for waiting tokens
        est_wait = None
        if t.status == "WAITING":
            est_wait = calculate_ewt_for_token(db, t)
            
        out_dict = TokenOut.model_validate(t).model_dump()
        out_dict["estimated_wait_minutes"] = est_wait
        items.append(TokenOut(**out_dict))

    print(f"DEBUG: Returning {len(items)} tokens via API")
    return {"items": items}


@router.delete("/{token_id}")
def delete_token(token_id: int, db: Session = Depends(get_db)):
    """Delete a token from the system."""
    token = db.query(models.Token).filter(models.Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    db.delete(token)
    db.commit()
    return {"status": "ok", "message": f"Token {token_id} deleted"}

