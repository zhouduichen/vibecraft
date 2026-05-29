from __future__ import annotations

from core.mapper import ComponentKind

from .base import Operator, timed_run
from .composite import CompositeOperator
from .dry_run import DryRunOperator
from .export import ExportOperator
from .image_model import ImageModelOperator
from .resize import ResizeOperator
from .text_model import TextModelOperator


class OperatorRegistry:
    """Look up a real or dry-run ``Operator`` by its component kind."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self._build_index()

    def _build_index(self) -> None:
        self._index: dict[ComponentKind, Operator] = {
            ComponentKind.TEXT_MODEL: TextModelOperator(),  # type: ignore[arg-type]
            ComponentKind.IMAGE_MODEL: ImageModelOperator(),  # type: ignore[arg-type]
            ComponentKind.RESIZE: ResizeOperator(),  # type: ignore[arg-type]
            ComponentKind.COMPOSITE: CompositeOperator(),  # type: ignore[arg-type]
            ComponentKind.EXPORT: ExportOperator(),  # type: ignore[arg-type]
        }

    def get(self, operator_name: str) -> Operator:
        if self.dry_run:
            return DryRunOperator()  # type: ignore[return-value]

        try:
            kind = ComponentKind(operator_name)
        except ValueError:
            raise KeyError(f"Unknown operator: {operator_name}")

        op = self._index.get(kind)
        if op is None:
            raise KeyError(f"No operator registered for: {operator_name}")
        return op

    def run(
        self,
        operator_name: str,
        params,
        context,
    ) -> ...:
        """Convenience: get + timed_run in one call."""
        op = self.get(operator_name)
        return timed_run(op, params, context)
