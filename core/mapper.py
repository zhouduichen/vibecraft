from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from core.schemas import (
    ComponentKind,
    CompositeConfig,
    ConfigValidator,
    ExportConfig,
    ImageModelConfig,
    PipelineConfig,
    ResizeConfig,
    TextModelConfig,
)


class InternalOperatorParams(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    component_id: str
    operator: ComponentKind
    payload: dict[str, Any] = Field(default_factory=dict)
    depends_on: list[str] = Field(default_factory=list)


class PipelinePlan(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    config: PipelineConfig
    operators: list[InternalOperatorParams]


class ConfigMapper:
    def map(self, raw_config: dict) -> PipelinePlan:
        config = ConfigValidator.validate(raw_config)
        operators = [self._map_component(component) for component in config.components]
        return PipelinePlan(config=config, operators=operators)

    def _map_component(self, component) -> InternalOperatorParams:
        if isinstance(component, TextModelConfig):
            return InternalOperatorParams(
                component_id=component.id,
                operator=component.kind,
                depends_on=component.depends_on,
                payload={
                    "provider": component.provider,
                    "model": component.model,
                    "prompt": component.prompt,
                    "system_prompt": component.system_prompt,
                    "temperature": component.temperature,
                },
            )

        if isinstance(component, ImageModelConfig):
            return InternalOperatorParams(
                component_id=component.id,
                operator=component.kind,
                depends_on=component.depends_on,
                payload={
                    "provider": component.provider,
                    "model": component.model,
                    "prompt_ref": component.prompt_ref,
                    "negative_prompt": component.negative_prompt,
                    "params": component.params.model_dump(),
                },
            )

        if isinstance(component, ResizeConfig):
            return InternalOperatorParams(
                component_id=component.id,
                operator=component.kind,
                depends_on=component.depends_on,
                payload={
                    "input_asset": component.input_asset,
                    "width": component.width,
                    "height": component.height,
                    "mode": component.mode,
                },
            )

        if isinstance(component, ExportConfig):
            return InternalOperatorParams(
                component_id=component.id,
                operator=component.kind,
                depends_on=component.depends_on,
                payload={
                    "target": component.target,
                    "output_path": component.output_path,
                    "quality": component.quality,
                },
            )

        if isinstance(component, CompositeConfig):
            return InternalOperatorParams(
                component_id=component.id,
                operator=component.kind,
                depends_on=component.depends_on,
                payload={
                    "layers": component.layers,
                    "blend_mode": component.blend_mode,
                },
            )

        raise ValidationError.from_exception_data(
            "ConfigMapper",
            [
                {
                    "type": "value_error",
                    "loc": ("components", getattr(component, "id", "<unknown>")),
                    "msg": "Unsupported component config",
                    "input": component,
                    "ctx": {"error": ValueError("unsupported component config")},
                }
            ],
        )
