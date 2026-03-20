import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
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
            models.Token.service_type.in_(counter_service_types),
            (models.Token.counter_id == None) | (models.Token.counter_id == counter_id)
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

    # 2. Call (atomic claim to prevent double-call race)
    updated_rows = (
        db.query(models.Token)
        .filter(
            models.Token.id == token_id,
            models.Token.status == "WAITING",
            or_(models.Token.counter_id.is_(None), models.Token.counter_id == counter_id),
        )
        .update(
            {
                models.Token.status: "CALLED",
                models.Token.counter_id: counter_id,
                models.Token.updated_at: datetime.now(timezone.utc),
            },
            synchronize_session=False,
        )
    )
    if updated_rows == 0:
        raise HTTPException(status_code=409, detail="Token already taken or not waiting")

    token = db.get(models.Token, token_id)
    db.commit()

    return {"token_id": token.id, "number": token.number, "status": "CALLED"}


@router.get("/{counter_id}/report")
def download_counter_report(
    counter_id: int,
    db: Session = Depends(get_db)
):
    """Download a PDF performance report for a specific counter"""
    from fpdf import FPDF

    counter = db.get(models.Counter, counter_id)
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")

    now = datetime.now(timezone.utc)

    # Fetch all tokens associated with this counter
    tokens = (
        db.query(models.Token)
        .filter(models.Token.counter_id == counter_id)
        .order_by(models.Token.created_at.asc())
        .all()
    )

    # --- Compute metrics ---
    completed = [t for t in tokens if t.status == "COMPLETED"]
    cancelled = [t for t in tokens if t.status == "CANCELLED"]
    total_served = len(completed)
    total_cancelled = len(cancelled)
    total_finished = total_served + total_cancelled
    completion_rate = (total_served / total_finished * 100) if total_finished > 0 else 0.0

    total_wait_seconds = 0
    for t in completed:
        start = t.created_at
        end = t.updated_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        total_wait_seconds += (end - start).total_seconds()

    avg_wait_seconds = total_wait_seconds / total_served if total_served > 0 else 0
    avg_wait_min = int(avg_wait_seconds // 60)
    avg_wait_sec = int(avg_wait_seconds % 60)
    avg_wait_display = f"{avg_wait_min}m {avg_wait_sec}s"

    service_counts = {}
    for t in tokens:
        service_counts[t.service_type] = service_counts.get(t.service_type, 0) + 1

    high_vuln = sum(1 for t in tokens if (t.vulnerability_score or 0) > 0.5)
    standard = len(tokens) - high_vuln
    service_types_list = counter.get_service_types_list()

    # --- Build PDF ---
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Header
    pdf.set_fill_color(30, 41, 59)  # Dark navy
    pdf.rect(0, 0, 210, 35, style="F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_y(8)
    pdf.cell(0, 10, "FairQ", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "Counter Performance Report", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(12)
    pdf.set_text_color(0, 0, 0)

    # Counter info
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, counter.name, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 5, f"Generated: {now.strftime('%Y-%m-%d %H:%M UTC')}  |  Status: {'Active' if counter.active else 'Inactive'}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, f"Service Types: {', '.join(service_types_list) if service_types_list else 'General'}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_draw_color(226, 232, 240)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # Performance Summary - KPI boxes
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Performance Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    kpi_data = [
        ("Tokens Served", str(total_served)),
        ("Tokens Cancelled", str(total_cancelled)),
        ("Completion Rate", f"{completion_rate:.1f}%"),
        ("Avg. Wait Time", avg_wait_display),
    ]
    col_w = 45
    start_x = 10
    y_pos = pdf.get_y()
    for i, (label, value) in enumerate(kpi_data):
        x = start_x + i * col_w
        pdf.set_fill_color(248, 250, 252)
        pdf.rect(x, y_pos, col_w - 2, 20, style="F")
        pdf.set_xy(x + 2, y_pos + 2)
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(col_w - 4, 4, label)
        pdf.set_xy(x + 2, y_pos + 8)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(col_w - 4, 8, value)

    pdf.set_y(y_pos + 25)

    # Service Type Breakdown
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Service Type Breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    if service_counts:
        pdf.set_fill_color(248, 250, 252)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(95, 7, "Service Type", border=0, fill=True)
        pdf.cell(40, 7, "Count", border=0, fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(30, 41, 59)
        for stype, count in service_counts.items():
            pdf.cell(95, 6, stype, border=0)
            pdf.cell(40, 6, str(count), border=0, new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(0, 6, "No tokens processed yet", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)

    # Priority Breakdown
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Priority Breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(95, 6, "High Priority (score > 0.5)")
    pdf.cell(40, 6, str(high_vuln), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(95, 6, "Standard Priority")
    pdf.cell(40, 6, str(standard), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_draw_color(226, 232, 240)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # Token Details Table
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Token Details", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    headers = ["Token #", "Service", "Status", "Vuln.", "Created", "Completed", "Wait"]
    col_widths = [20, 38, 22, 14, 34, 34, 18]

    # Table header
    pdf.set_fill_color(30, 41, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 7)
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 7, h, border=0, fill=True)
    pdf.ln()

    # Table rows
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(30, 41, 59)
    for idx, t in enumerate(tokens):
        start = t.created_at
        end = t.updated_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        wait_min = round((end - start).total_seconds() / 60.0, 1)

        if idx % 2 == 0:
            pdf.set_fill_color(248, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)

        row = [
            t.number,
            t.service_type[:18],
            t.status,
            str(round(t.vulnerability_score or 0, 2)),
            start.strftime("%Y-%m-%d %H:%M"),
            end.strftime("%Y-%m-%d %H:%M"),
            f"{wait_min}m",
        ]
        for i, val in enumerate(row):
            pdf.cell(col_widths[i], 6, val, border=0, fill=True)
        pdf.ln()

    if not tokens:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(0, 8, "No tokens have been processed by this counter yet.", new_x="LMARGIN", new_y="NEXT")

    # Footer
    pdf.ln(10)
    pdf.set_draw_color(226, 232, 240)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, "FairQ - Fairness-Aware Bank Queue Management System", align="C")

    # Output
    pdf_bytes = pdf.output()
    output = io.BytesIO(pdf_bytes)
    output.seek(0)

    safe_name = counter.name.replace(" ", "_").lower()
    filename = f"fairq_report_{safe_name}_{now.strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
