import time
from datetime import datetime, timezone
from typing import List
from app.schemas.analysis import ExecutionTraceStep


class ExecutionTraceCollector:
    """
    Collects observable execution events for transparency and auditability,
    strictly without leaking private internal chains-of-thought.
    """
    def __init__(self):
        self.steps: List[ExecutionTraceStep] = []
        self._start_time = time.time()
        self._step_counter = 1

    def add_step(self, name: str, details: str, status: str = "completed", duration_ms: float = 0.0) -> None:
        step_obj = ExecutionTraceStep(
            step=self._step_counter,
            name=name,
            status=status,
            details=details,
            timestamp=datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z",
            duration_ms=round(duration_ms, 1)
        )
        self.steps.append(step_obj)
        self._step_counter += 1

    def get_steps(self) -> List[ExecutionTraceStep]:
        return self.steps

    def total_elapsed_ms(self) -> float:
        return (time.time() - self._start_time) * 1000.0
