from typing import Any


def suggest_next(queue_items: list[dict[str, Any]]) -> dict[str, Any] | None:
    return queue_items[0] if queue_items else None


