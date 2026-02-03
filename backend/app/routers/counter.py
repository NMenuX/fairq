from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.config import settings
from app.db import models
from app.services.runtime import get_db
from app.services.policies import dwfq
from app.schemas.counter import CounterCreate, CounterOut, CounterUpdate


router = APIRouter(prefix="/counters", tags=["counters"])



@router.get("/suggest-next")
def suggest_next(db: Session = Depends(get_db)) -> dict[str, str | int] | dict[str, None]:
    """Suggest next token (all counters) - for backward compatibility"""
    now = datetime.now(timezone.utc)
    waiting = (
        db.query(models.Token)
        .filter(models.Token.status == "WAITING")
        .order_by(models.Token.created_at.asc())
        .all()
    )
    queue_items = []
    for t in waiting:
        created_at = t.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        wait_minutes = max((now - created_at).total_seconds() / 60.0, 0.0)
        queue_items.append({
            "token_id": t.id,
            "number": t.number,
            "vulnerability_score": float(t.vulnerability_score or 0.0),
            "wait_minutes": wait_minutes,
            "service_type": t.service_type,
        })

    choice = dwfq.suggest_next(queue_items, max_fairness_ratio=settings.max_fairness_ratio)
    if not choice:
        return {"token_id": None, "number": None}
    return {"token_id": int(choice["token_id"]), "number": str(choice["number"])}


@router.post("/", response_model=CounterOut)
def create_counter(payload: CounterCreate, db: Session = Depends(get_db)) -> CounterOut:
    """Create a new counter with assigned service types"""
    # Check if counter name already exists
    existing = db.query(models.Counter).filter(models.Counter.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Counter with this name already exists")
    
    counter = models.Counter(
        name=payload.name,
        active=payload.active,
    )
    counter.set_service_types_list(payload.service_types)
    db.add(counter)
    db.commit()
    db.refresh(counter)
    
    # Convert to output format
    result = CounterOut(
        id=counter.id,
        name=counter.name,
        service_types=counter.get_service_types_list(),
        active=counter.active,
    )
    return result


@router.get("/", response_model=List[CounterOut])
def list_counters(db: Session = Depends(get_db)) -> List[CounterOut]:
    """List all counters"""
    counters = db.query(models.Counter).all()
    return [
        CounterOut(
            id=c.id,
            name=c.name,
            service_types=c.get_service_types_list(),
            active=c.active,
        )
        for c in counters
    ]


@router.get("/{counter_id}", response_model=CounterOut)
def get_counter(counter_id: int, db: Session = Depends(get_db)) -> CounterOut:
    """Get a specific counter by ID"""
    counter = db.get(models.Counter, counter_id)
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")
    
    return CounterOut(
        id=counter.id,
        name=counter.name,
        service_types=counter.get_service_types_list(),
        active=counter.active,
    )


@router.put("/{counter_id}", response_model=CounterOut)
def update_counter(
    counter_id: int,
    payload: CounterUpdate,
    db: Session = Depends(get_db)
) -> CounterOut:
    """Update a counter"""
    counter = db.get(models.Counter, counter_id)
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")
    
    if payload.name is not None:
        # Check if new name conflicts with another counter
        existing = db.query(models.Counter).filter(
            models.Counter.name == payload.name,
            models.Counter.id != counter_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Counter with this name already exists")
        counter.name = payload.name
    
    if payload.service_types is not None:
        counter.set_service_types_list(payload.service_types)
    
    if payload.active is not None:
        counter.active = payload.active
    
    db.commit()
    db.refresh(counter)
    
    return CounterOut(
        id=counter.id,
        name=counter.name,
        service_types=counter.get_service_types_list(),
        active=counter.active,
    )


@router.delete("/{counter_id}")
def delete_counter(counter_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    """Delete a counter"""
    counter = db.get(models.Counter, counter_id)
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")
    
    db.delete(counter)
    db.commit()
    return {"status": "ok"}


@router.get("/{counter_id}/suggest-next")
def suggest_next_for_counter(
    counter_id: int,
    db: Session = Depends(get_db)
) -> dict[str, str | int] | dict[str, None]:
    """Suggest next token for a specific counter based on its service types"""
    counter = db.get(models.Counter, counter_id)
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")
    
    if not counter.active:
        raise HTTPException(status_code=400, detail="Counter is not active")
    
    # Get service types this counter can handle
    counter_service_types = counter.get_service_types_list()
    if not counter_service_types:
        return {"token_id": None, "number": None}
    
    now = datetime.now(timezone.utc)
    # Filter tokens by counter's service types
    waiting = (
        db.query(models.Token)
        .filter(
            models.Token.status == "WAITING",
            models.Token.service_type.in_(counter_service_types)
        )
        .order_by(models.Token.created_at.asc())
        .all()
    )
    
    queue_items = []
    for t in waiting:
        created_at = t.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        wait_minutes = max((now - created_at).total_seconds() / 60.0, 0.0)
        queue_items.append({
            "token_id": t.id,
            "number": t.number,
            "vulnerability_score": float(t.vulnerability_score or 0.0),
            "wait_minutes": wait_minutes,
            "service_type": t.service_type,
        })

    choice = dwfq.suggest_next(queue_items, max_fairness_ratio=settings.max_fairness_ratio)
    if not choice:
        return {"token_id": None, "number": None}
    return {"token_id": int(choice["token_id"]), "number": str(choice["number"])}


@router.put("/{counter_id}/call_next")
def call_next_token_for_counter(
    counter_id: int,
    db: Session = Depends(get_db)
) -> dict[str, str | int]:
    """Suggest AND Call the next token for this counter"""
    # 1. Suggest
    suggestion = suggest_next_for_counter(counter_id, db)
    token_id = suggestion.get("token_id")
    
    if not token_id:
        raise HTTPException(status_code=404, detail="No tokens waiting for this service")

    # 2. Call (Re-fetch to lock/update)
    token = db.get(models.Token, token_id)
    if not token or token.status != "WAITING":
         raise HTTPException(status_code=409, detail="Token already taken or not waiting")
    
    token.status = "CALLED"
    token.counter_id = counter_id
    token.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"token_id": token.id, "number": token.number, "status": "CALLED"}



