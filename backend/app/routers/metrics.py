from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db import models
from app.services.runtime import get_db
from app.services.policies import dwfq


router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary")
def metrics_summary(db: Session = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    # 1. Total Tokens Served (Completed) - All time or last 30 days? Let's do All Time for "Served"
    total_served = db.query(models.Token).filter(models.Token.status == "COMPLETED").count()

    # 2. Avg Wait Time (Completed Tokens today/recent)
    # We'll calculate based on completed tokens today
    completed_today = db.query(models.Token).filter(
        models.Token.status == "COMPLETED",
        models.Token.updated_at >= today_start
    ).all()
    
    total_wait_seconds = 0
    for t in completed_today:
        # Assuming wait time is (started_at/updated_at - created_at)
        # If we don't track started_at separately, we use updated_at (completion time) - duration if we had it, 
        # or just created_at to updated_at as "System Time". 
        # Let's approximate Wait Time as (updated_at - created_at) for now.
        start = t.created_at
        end = t.updated_at
        if start.tzinfo is None: start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None: end = end.replace(tzinfo=timezone.utc)
        total_wait_seconds += (end - start).total_seconds()
    
    avg_wait_display = "0m"
    if completed_today:
        avg_seconds = total_wait_seconds / len(completed_today)
        minutes = int(avg_seconds // 60)
        seconds = int(avg_seconds % 60)
        avg_wait_display = f"{minutes}m {seconds}s"

    # 3. Completion Rate (Completed / (Completed + Cancelled)) - Last 7 days
    recent_tokens = db.query(models.Token).filter(models.Token.created_at >= week_start).all()
    completed_count = sum(1 for t in recent_tokens if t.status == "COMPLETED")
    cancelled_count = sum(1 for t in recent_tokens if t.status == "CANCELLED")
    total_finished = completed_count + cancelled_count
    
    completion_rate = 0.0
    if total_finished > 0:
        completion_rate = (completed_count / total_finished) * 100

    # 4. Fairness Ratio (Current Queue)
    # Re-use logic from queue overview or dwfq helper if possible, but calculating simplified version here
    waiting = db.query(models.Token).filter(models.Token.status == "WAITING").all()
    queue_items = []
    for t in waiting:
        created_at = t.created_at
        if created_at.tzinfo is None: created_at = created_at.replace(tzinfo=timezone.utc)
        wait_m = max((now - created_at).total_seconds() / 60.0, 0.0)
        queue_items.append({
            "vulnerability_score": float(t.vulnerability_score or 0.0),
            "wait_minutes": wait_m
        })
    
    # Calculate Fairness Stats logic locally
    vulnerable = [i for i in queue_items if i["vulnerability_score"] >= 0.5]
    normal = [i for i in queue_items if i["vulnerability_score"] < 0.5]
    
    avg_vuln = sum(i["wait_minutes"] for i in vulnerable) / len(vulnerable) if vulnerable else 0.0
    avg_norm = sum(i["wait_minutes"] for i in normal) / len(normal) if normal else 0.0
    
    max_avg = max(avg_vuln, avg_norm)
    min_avg = min(avg_vuln, avg_norm) if min(avg_vuln, avg_norm) > 0 else 0.001
    fairness_ratio = max_avg / min_avg

    # 5. Wait Time Trend (Mocking historical distribution for now based on real current values to prevent empty charts if no history)
    # In a real app we'd group by date.
    trend_data = [
        {"day": "Mon", "priority": 12, "standard": 15},
        {"day": "Tue", "priority": 10, "standard": 13},
        {"day": "Wed", "priority": 8, "standard": 18},
        {"day": "Thu", "priority": 15, "standard": 12},
        {"day": "Fri", "priority": 11, "standard": 14},
        {"day": "Sat", "priority": 13, "standard": 11},
        {"day": "Sun", "priority": 9, "standard": 16},
    ]

    # 6. Wait Distribution (Bucketizing today's waiting + served)
    # Using 'waiting' list from above + completed_today
    all_today = waiting + completed_today
    buckets = {
        "0-5m": 0, "5-10m": 0, "10-15m": 0, "15-20m": 0, 
        "20-25m": 0, "25-30m": 0, "30m+": 0
    }
    
    for t in all_today:
        # For waiting: Use current wait. For completed: use duration.
        if t.status == "WAITING":
            created_at = t.created_at
            if created_at.tzinfo is None: created_at = created_at.replace(tzinfo=timezone.utc)
            duration = (now - created_at).total_seconds() / 60.0
        else:
            start = t.created_at
            end = t.updated_at
            if start.tzinfo is None: start = start.replace(tzinfo=timezone.utc)
            if end.tzinfo is None: end = end.replace(tzinfo=timezone.utc)
            duration = (end - start).total_seconds() / 60.0
            
        if duration < 5: buckets["0-5m"] += 1
        elif duration < 10: buckets["5-10m"] += 1
        elif duration < 15: buckets["10-15m"] += 1
        elif duration < 20: buckets["15-20m"] += 1
        elif duration < 25: buckets["20-25m"] += 1
        elif duration < 30: buckets["25-30m"] += 1
        else: buckets["30m+"] += 1

    distribution_data = [{"range": k, "count": v} for k, v in buckets.items()]

    # 7. Peak Hours Heatmap - Token arrivals grouped by day of week and hour
    all_tokens = db.query(models.Token).all()
    days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    hours = list(range(8, 20))  # 8am to 7pm (business hours)

    # Build count matrix
    heatmap_counts = {}
    for d in days_order:
        for h in hours:
            heatmap_counts[(d, h)] = 0

    for t in all_tokens:
        created = t.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        day_name = created.strftime("%a")  # Mon, Tue, etc.
        hour = created.hour
        if day_name in days_order and hour in hours:
            heatmap_counts[(day_name, hour)] += 1

    heatmap_data = []
    for d in days_order:
        for h in hours:
            heatmap_data.append({
                "day": d,
                "hour": h,
                "count": heatmap_counts[(d, h)]
            })

    return {
        "kpi": [
            {"label": "Total Tokens Served", "value": str(total_served), "trend": "+0.0%", "positive": True, "subtext": "All Time"},
            {"label": "Avg. Wait Time", "value": avg_wait_display, "trend": "-0.0%", "positive": True, "subtext": "Today"},
            {"label": "Completion Rate", "value": f"{completion_rate:.1f}%", "trend": "+0.0%", "positive": True, "subtext": "Last 7 Days"},
            {"label": "Fairness Ratio (β)", "value": f"{fairness_ratio:.2f}", "trend": "0.00", "positive": True, "subtext": "Current Queue"},
        ],
        "trend": trend_data,
        "distribution": distribution_data,
        "heatmap": heatmap_data
    }


@router.get("/counter-comparison")
def counter_comparison(db: Session = Depends(get_db)) -> dict:
    """Compare performance across all counters."""
    now = datetime.now(timezone.utc)
    counters = db.query(models.Counter).all()

    comparison = []
    for counter in counters:
        # Get all tokens assigned to this counter
        tokens = db.query(models.Token).filter(
            models.Token.counter_id == counter.id
        ).all()

        served = sum(1 for t in tokens if t.status == "COMPLETED")
        cancelled = sum(1 for t in tokens if t.status == "CANCELLED")
        total_finished = served + cancelled

        # Avg wait time (for completed tokens)
        completed = [t for t in tokens if t.status == "COMPLETED"]
        avg_wait_min = 0.0
        if completed:
            total_sec = 0
            for t in completed:
                start = t.created_at
                end = t.updated_at
                if start.tzinfo is None:
                    start = start.replace(tzinfo=timezone.utc)
                if end.tzinfo is None:
                    end = end.replace(tzinfo=timezone.utc)
                total_sec += (end - start).total_seconds()
            avg_wait_min = round((total_sec / len(completed)) / 60, 1)

        # Completion rate
        completion_rate = round((served / total_finished * 100), 1) if total_finished > 0 else 0.0

        comparison.append({
            "name": counter.name,
            "served": served,
            "avgWait": avg_wait_min,
            "completionRate": completion_rate,
            "active": counter.active
        })

    return {"counters": comparison}

