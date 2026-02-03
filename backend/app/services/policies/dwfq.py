from typing import Any

# --- Constants for the DWFQ algorithm ---

# In effective_priority, how much weight to give to waiting time.
# The formula is: priority = score + (wait_minutes / DIVISOR) * WEIGHT
WAIT_TIME_PRIORITY_DIVISOR = 5.0
WAIT_TIME_PRIORITY_WEIGHT = 0.1

# The score threshold to classify an item as 'vulnerable'.
VULNERABILITY_THRESHOLD = 0.5

# A small number to prevent division by zero when calculating fairness ratio.
MIN_AVG_DENOMINATOR = 1e-6


def effective_priority(vulnerability_score: float, wait_minutes: float) -> float:
    return vulnerability_score + (wait_minutes / WAIT_TIME_PRIORITY_DIVISOR) * WAIT_TIME_PRIORITY_WEIGHT


def _avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def suggest_next(queue_items: list[dict[str, Any]], max_fairness_ratio: float = 1.5) -> dict[str, Any] | None:
    if not queue_items:
        return None

    for item in queue_items:
        item["_priority"] = effective_priority(item.get("vulnerability_score", 0.0), item.get("wait_minutes", 0.0))

    vulnerable = [i for i in queue_items if i.get("vulnerability_score", 0.0) >= VULNERABILITY_THRESHOLD]
    normal = [i for i in queue_items if i.get("vulnerability_score", 0.0) < VULNERABILITY_THRESHOLD]

    avg_vuln = _avg([i.get("wait_minutes", 0.0) for i in vulnerable])
    avg_norm = _avg([i.get("wait_minutes", 0.0) for i in normal])

    # If one group is empty, just return highest priority
    if not vulnerable or not normal:
        return max(queue_items, key=lambda x: x["_priority"])

    max_avg = max(avg_vuln, avg_norm)
    min_avg = min(avg_vuln, avg_norm) if min(avg_vuln, avg_norm) > 0 else MIN_AVG_DENOMINATOR
    fairness_ratio = max_avg / min_avg

    if fairness_ratio > max_fairness_ratio:
        disadvantaged = vulnerable if avg_vuln > avg_norm else normal
        return max(disadvantaged, key=lambda x: x["_priority"])

    return max(queue_items, key=lambda x: x["_priority"])
