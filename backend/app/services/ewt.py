from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..db import models
from ..services.policies.dwfq import effective_priority

def calculate_ewt_for_token(db: Session, token: models.Token) -> int:
    """
    Calculate Estimated Wait Time (EWT) in minutes for a specific token.
    Uses the DWFQ policy to determine how many people are ahead in the queue.
    """
    if token.status != "WAITING":
        return 0

    # 1. Get all waiting tokens for this particular service type
    waiting_tokens = db.query(models.Token).filter(
        models.Token.status == "WAITING",
        models.Token.service_type == token.service_type
    ).all()

    now = datetime.now(timezone.utc)
    
    # Calculate priority of the target token
    # If the token was just created, wait_m will be 0
    token_created = token.created_at
    if token_created.tzinfo is None:
        token_created = token_created.replace(tzinfo=timezone.utc)
    target_wait_m = max((now - token_created).total_seconds() / 60.0, 0.0)
    target_prio = effective_priority(token.vulnerability_score or 0.0, target_wait_m)

    ahead_count = 0
    for w in waiting_tokens:
        if w.id == token.id:
            continue
            
        w_created = w.created_at
        if w_created.tzinfo is None:
            w_created = w_created.replace(tzinfo=timezone.utc)
        wait_m = max((now - w_created).total_seconds() / 60.0, 0.0)
        
        # Calculate their current dynamic priority
        prio = effective_priority(w.vulnerability_score or 0.0, wait_m)
        
        # If their priority is higher, they will be served before us
        if prio > target_prio:
            ahead_count += 1
        elif prio == target_prio and w_created < token_created:
            # If priority is equal, older token (FIFO) is ahead
            ahead_count += 1
             
    # Calculate EWT (Assume conservative average of 5 mins per token ahead)
    # We add 1 to include the token itself if we consider 'time until completion', 
    # but usually EWT is 'time until call'. Let's stick to (ahead_count + 1) * 5
    # to maintain consistency with the previous (though fragmented) implementation.
    est_wait = (ahead_count + 1) * 5
    return int(est_wait)
