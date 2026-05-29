from __future__ import annotations

import os
from pathlib import Path

from core.mapper import InternalOperatorParams

from .base import Operator, OperatorResult, PipelineContext

TARGET_EXTENSIONS = {
    "png": ".png",
    "jpg": ".jpg",
    "mp4": ".mp4",
    "html": ".html",
    "zip": ".zip",
}


class ExportOperator:
    """Render or export the pipeline output to a file.

    Payload keys:

    - ``target`` — one of ``png``, ``jpg``, ``mp4``, ``html``, ``zip``
    - ``output_path`` — filesystem path for the output
    - ``quality`` — output quality 1–100 (relevant for jpg/png)
    """

    def run(
        self,
        params: InternalOperatorParams,
        context: PipelineContext,
    ) -> OperatorResult:
        payload = params.payload
        target = payload.get("target", "html")
        output_path = payload.get("output_path", "")
        quality = payload.get("quality", 90)

        if not output_path:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error="ExportOperator: output_path is required",
            )

        ext = TARGET_EXTENSIONS.get(target, ".html")
        resolved = Path(output_path)
        if not resolved.suffix:
            resolved = resolved.with_suffix(ext)

        if target == "html":
            return self._export_html(params, context, resolved)
        else:
            return self._export_other(params, target, resolved, quality)

    def _export_html(
        self,
        params: InternalOperatorParams,
        context: PipelineContext,
        resolved: Path,
    ) -> OperatorResult:
        # Collect HTML from operator outputs. Each entry in context.results
        # is an OperatorResult dict whose "output" dict may contain "content".
        html_content = None
        for val in reversed(list(context.results.values())):
            if not isinstance(val, dict):
                continue
            output = val.get("output") or {}
            if isinstance(output, dict):
                html_content = output.get("content") or output.get("html")
            if not html_content and isinstance(val.get("content"), str):
                html_content = val["content"]
            if html_content:
                break

        if not html_content:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error="ExportOperator: no HTML content found in pipeline results",
            )

        try:
            resolved.parent.mkdir(parents=True, exist_ok=True)
            resolved.write_text(str(html_content), encoding="utf-8")
        except OSError as exc:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error=f"ExportOperator: write failed — {exc}",
            )

        return OperatorResult(
            component_id=params.component_id,
            operator=params.operator.value,
            success=True,
            output={
                "target": "html",
                "path": str(resolved.resolve()),
                "size_bytes": resolved.stat().st_size,
            },
        )

    def _export_other(
        self,
        params: InternalOperatorParams,
        target: str,
        resolved: Path,
        quality: int,
    ) -> OperatorResult:
        return OperatorResult(
            component_id=params.component_id,
            operator=params.operator.value,
            success=False,
            error=f"ExportOperator: not implemented: {target} export requires a renderer",
        )
