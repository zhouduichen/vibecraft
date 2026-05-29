from __future__ import annotations

from core.mapper import InternalOperatorParams

from .base import Operator, OperatorResult, PipelineContext


class ResizeOperator:
    """Resize an input image to the specified dimensions.

    Payload keys:

    - ``input_asset`` — asset / component ID to resize
    - ``width`` — target width in pixels
    - ``height`` — target height in pixels
    - ``mode`` — ``fit`` (maintain aspect ratio), ``fill`` (crop), ``stretch``
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
            error="ResizeOperator: not implemented: requires Pillow",
        )
