from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..schemas.queue import QueueOverview, QueueOverviewItem
from ..db import models
from ..services.runtime import get_db
from ..services.policies import dwfq


router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/overview", response_model=QueueOverview)
def queue_overview(
    counter_id: Optional[int] = Query(None, description="Filter by counter ID"),
    db: Session = Depends(get_db)
) -> QueueOverview:
    """Get queue overview, optionally filtered by counter"""
    now = datetime.now(timezone.utc)
    
    # Base query for waiting tokens
    query = db.query(models.Token).filter(models.Token.status == "WAITING")
    
    # If counter_id is provided, filter by counter's service types
    if counter_id is not None:
        counter = db.get(models.Counter, counter_id)
        if not counter:
            raise HTTPException(status_code=404, detail="Counter not found")
        
        counter_service_types = counter.get_service_types_list()
        if counter_service_types:
            query = query.filter(
                models.Token.service_type.in_(counter_service_types),
                (models.Token.counter_id == None) | (models.Token.counter_id == counter_id)
            )
        else:
            # Counter has no service types, return empty queue
            return QueueOverview(items=[])
    else:
        query = query.filter(models.Token.counter_id == None)
    
    waiting = query.all()
    
    items: list[QueueOverviewItem] = []
    for t in waiting:
        created_at = t.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        wait_minutes = max((now - created_at).total_seconds() / 60.0, 0.0)
        
        # Calculate priority using DWFQ logic
        v_score = float(t.vulnerability_score or 0.0)
        priority = dwfq.effective_priority(v_score, wait_minutes)
        
        items.append(QueueOverviewItem(
            token_id=t.id,
            number=t.number,
            service_type=t.service_type,
            status=t.status,
            vulnerability_score=v_score,
            wait_minutes=wait_minutes,
            counter_id=t.counter_id,
        ))
        # Store priority temporarily for sorting
        items[-1]._sort_priority = priority

    # Sort items by priority (descending)
    items.sort(key=lambda x: getattr(x, '_sort_priority', 0), reverse=True)
    
    return QueueOverview(items=items)


