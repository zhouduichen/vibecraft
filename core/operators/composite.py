from __future__ import annotations

from core.mapper import InternalOperatorParams

from .base import Operator, OperatorResult, PipelineContext


class CompositeOperator:
    """Composite multiple layers into a single output image.

    Payload keys:

    - ``layers`` — ordered list of asset / component IDs (bottom to top)
    - ``blend_mode`` — ``normal``, ``multiply``, ``screen``, ``overlay``
    """

    def run(
        self,
        params: InternalOperatorParams,
        context: PipelineContext,
    ) -> OperatorResult:
        return OperatorResult(
            component_id=params.component_id,
            operator=params.operator.value,
            success=False,
            error="CompositeOperator: not implemented: requires Pillow",
        )
