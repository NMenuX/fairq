from typing import Protocol, Any


class Policy(Protocol):
    def suggest_next(self, queue_items: list[dict[str, Any]]) -> dict[str, Any] | None:
        ...


