"""Trigger execution summary DTO."""

from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True, slots=True)
class TriggerExecutionSummary:
    executed_count: int
    trigger_ids: List[int]
    trigger_names: List[str]

    def build_reason(self, max_names: int = 3) -> Optional[str]:
        if self.executed_count <= 0:
            return None
        if not self.trigger_names:
            return f"Сработало триггеров: {self.executed_count}"
        names = self.trigger_names[:max_names]
        remainder = len(self.trigger_names) - len(names)
        suffix = f" и еще {remainder}" if remainder > 0 else ""
        prefix = "Сработал триггер" if len(self.trigger_names) == 1 else "Сработали триггеры"
        return f"{prefix}: {', '.join(names)}{suffix}"