from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


class ComponentKind(str, Enum):
    TEXT_MODEL = "text_model"
    IMAGE_MODEL = "image_model"
    RESIZE = "resize"
    COMPOSITE = "composite"
    EXPORT = "export"


class Metadata(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    project: str = Field(..., min_length=1, max_length=80)
    config_version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$")
    pipeline_version: str = Field(default="1.0.0", pattern=r"^\d+\.\d+\.\d+$")
    created_by: str = Field(default="unknown", min_length=1)
    revision: int = Field(default=1, ge=1)


class Params(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    seed: int = Field(default=42, ge=0, le=2_147_483_647)
    width: int = Field(default=1024, ge=256, le=4096)
    height: int = Field(default=1024, ge=256, le=4096)
    steps: int = Field(default=30, ge=1, le=150)
    guidance_scale: float = Field(default=7.5, ge=0.0, le=30.0)
    batch_size: int = Field(default=1, ge=1, le=16)
    timeout_seconds: int = Field(default=300, ge=1, le=3600)

    @field_validator("width", "height")
    @classmethod
    def must_be_multiple_of_8(cls, value: int) -> int:
        if value % 8 != 0:
            raise ValueError("must be divisible by 8")
        return value


class BaseComponentConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str = Field(..., min_length=1)
    enabled: bool = True
    depends_on: list[str] = Field(default_factory=list)


class TextModelConfig(BaseComponentConfig):
    kind: Literal[ComponentKind.TEXT_MODEL]
    provider: Literal["openai", "anthropic", "local"]
    model: str = Field(..., min_length=1)
    prompt: str = Field(..., min_length=1)
    system_prompt: str = ""
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class ImageModelConfig(BaseComponentConfig):
    kind: Literal[ComponentKind.IMAGE_MODEL]
    provider: Literal["diffusers", "replicate", "local"]
    model: str = Field(..., min_length=1)
    prompt_ref: str = Field(..., min_length=1)
    negative_prompt: str = ""
    params: Params = Field(default_factory=Params)


class ResizeConfig(BaseComponentConfig):
    kind: Literal[ComponentKind.RESIZE]
    input_asset: str = Field(..., min_length=1)
    width: int = Field(..., ge=64, le=8192)
    height: int = Field(..., ge=64, le=8192)
    mode: Literal["fit", "fill", "stretch"] = "fit"


class CompositeConfig(BaseComponentConfig):
    kind: Literal[ComponentKind.COMPOSITE]
    layers: list[str] = Field(..., min_length=1)
    blend_mode: Literal["normal", "multiply", "screen", "overlay"] = "normal"


class ExportConfig(BaseComponentConfig):
    kind: Literal[ComponentKind.EXPORT]
    target: Literal["png", "jpg", "mp4", "html", "zip"]
    output_path: str = Field(..., min_length=1)
    quality: int = Field(default=90, ge=1, le=100)


ComponentConfig = Annotated[
    Union[
        TextModelConfig,
        ImageModelConfig,
        ResizeConfig,
        CompositeConfig,
        ExportConfig,
    ],
    Field(discriminator="kind"),
]


class AssetConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str = Field(..., min_length=1)
    path: str = Field(..., min_length=1)
    required: bool = True


class PipelineConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    metadata: Metadata
    assets: list[AssetConfig] = Field(default_factory=list)
    params: Params = Field(default_factory=Params)
    components: list[ComponentConfig] = Field(..., min_length=1)


class ConfigValidator:
    @staticmethod
    def validate(raw_config: dict) -> PipelineConfig:
        try:
            return PipelineConfig.model_validate(raw_config)
        except ValidationError:
            raise
