from __future__ import annotations

from core.mapper import InternalOperatorParams

from .base import Operator, OperatorResult, PipelineContext


class ImageModelOperator:
    """Generate an image using the specified provider and model.

    Payload keys:

    - ``provider`` — one of ``diffusers``, ``replicate``, ``local``
    - ``model`` — model identifier
    - ``prompt_ref`` — component ID whose text output is the prompt
    - ``negative_prompt`` — text to discourage in generation
    - ``params`` — generation parameters (seed, width, height, steps, etc.)
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
            error="ImageModelOperator: not implemented: requires diffusers or provider SDK",
        )
