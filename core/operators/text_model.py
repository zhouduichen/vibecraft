from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

from core.mapper import InternalOperatorParams

from .base import Operator, OperatorResult, PipelineContext


class TextModelOperator:
    """Call an OpenAI-compatible text generation API.

    Payload keys (populated by ``mapper.py``):

    - ``provider`` — one of ``openai``, ``anthropic``, ``local``
    - ``model`` — model identifier (e.g. ``gpt-4``, ``claude-sonnet-4``)
    - ``prompt`` — user prompt text
    - ``system_prompt`` — optional system prompt (default: generic helper)
    - ``temperature`` — sampling temperature (0.0 – 2.0)
    """

    DEFAULT_BASE_URL = os.environ.get("AI_API_BASE_URL", "https://api.siliconflow.cn")
    DEFAULT_API_KEY = os.environ.get("AI_API_KEY", "")
    DEFAULT_MODEL = os.environ.get("AI_MODEL", "deepseek-ai/DeepSeek-V3")

    def run(
        self,
        params: InternalOperatorParams,
        context: PipelineContext,
    ) -> OperatorResult:
        payload = params.payload
        provider = payload.get("provider", "openai")
        model = payload.get("model", self.DEFAULT_MODEL)
        prompt = payload.get("prompt", "")
        system_prompt = payload.get("system_prompt", "")
        temperature = payload.get("temperature", 0.7)

        if not prompt:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error="TextModelOperator: empty prompt",
            )

        if provider == "openai":
            return self._call_openai(params, model, prompt, system_prompt, temperature)
        elif provider == "anthropic":
            return self._call_anthropic(params, model, prompt, system_prompt, temperature)
        else:
            return self._call_openai(params, model, prompt, system_prompt, temperature)

    def _call_openai(
        self,
        params: InternalOperatorParams,
        model: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
    ) -> OperatorResult:
        api_key = self.DEFAULT_API_KEY
        if not api_key:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error="TextModelOperator: AI_API_KEY not set",
            )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        else:
            messages.append({"role": "system", "content": "You are a helpful assistant."})
        messages.append({"role": "user", "content": prompt})

        body = json.dumps({
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 8192,
        }).encode()

        req = urllib.request.Request(
            f"{self.DEFAULT_BASE_URL}/v1/chat/completions",
            data=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data: dict[str, Any] = json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = exc.read().decode(errors="replace")[:500]
            except Exception:
                pass
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error=f"TextModelOperator: HTTP {exc.code} — {detail}",
            )
        except Exception as exc:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error=f"TextModelOperator: {exc}",
            )

        choices = data.get("choices", [])
        if not choices:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error="TextModelOperator: no choices in response",
            )

        content = choices[0].get("message", {}).get("content", "")
        return OperatorResult(
            component_id=params.component_id,
            operator=params.operator.value,
            success=True,
            output={"content": content, "model": model, "usage": data.get("usage")},
        )

    def _call_anthropic(
        self,
        params: InternalOperatorParams,
        model: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
    ) -> OperatorResult:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error="TextModelOperator: ANTHROPIC_API_KEY not set",
            )

        body = json.dumps({
            "model": model,
            "max_tokens": 8192,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }).encode()

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = exc.read().decode(errors="replace")[:500]
            except Exception:
                pass
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error=f"TextModelOperator: Anthropic HTTP {exc.code} — {detail}",
            )
        except Exception as exc:
            return OperatorResult(
                component_id=params.component_id,
                operator=params.operator.value,
                success=False,
                error=f"TextModelOperator: {exc}",
            )

        content_blocks = data.get("content", [])
        content = "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text")
        return OperatorResult(
            component_id=params.component_id,
            operator=params.operator.value,
            success=True,
            output={"content": content, "model": model, "usage": data.get("usage")},
        )
