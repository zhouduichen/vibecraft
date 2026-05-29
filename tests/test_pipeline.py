"""Regression tests for the pipeline core and operators.

Run with::

    python -m pytest tests/test_pipeline.py -v

or without pytest::

    python -m tests.test_pipeline
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from uuid import UUID

from core.mapper import ConfigMapper
from core.operators import (
    DryRunOperator,
    OperatorRegistry,
    PipelineContext,
)
from core.orchestrator import CheckpointStore, PipelineOrchestrator
from core.schemas import ConfigValidator, Metadata, Params, ValidationError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _minimal_config(overrides: dict | None = None) -> dict:
    cfg: dict = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "t1",
                "kind": "text_model",
                "provider": "openai",
                "model": "gpt-4",
                "prompt": "hello",
            }
        ],
    }
    if overrides:
        cfg.update(overrides)
    return cfg


def _run_dry(raw_config: dict) -> dict:
    orch = PipelineOrchestrator(
        mapper=ConfigMapper(),
        registry=OperatorRegistry(dry_run=True),
        checkpoint_store=CheckpointStore(os.devnull),
    )
    return orch.run(raw_config=raw_config, run_id="test-run", resume=False)


def _run_real(raw_config: dict) -> dict:
    orch = PipelineOrchestrator(
        mapper=ConfigMapper(),
        registry=OperatorRegistry(dry_run=False),
        checkpoint_store=CheckpointStore(os.devnull),
    )
    return orch.run(raw_config=raw_config, run_id="test-run", resume=False)


def _expect_failure(fn, expected: str) -> None:
    try:
        fn()
    except Exception as exc:
        message = str(exc)
        assert expected in message, f"expected {expected!r} in {message!r}"
    else:
        raise AssertionError(f"expected failure containing {expected!r}")


def check_success(result: dict) -> None:
    assert result["status"] == "ok", f"Expected ok, got {result}"
    cid = list(result["context"]["results"].keys())[0]
    r = result["context"]["results"][cid]
    assert r["success"], f"Operator failed: {r.get('error')}"
    assert r["component_id"] == cid
    assert r["duration_ms"] is not None


# ===================================================================
# 1. Validation — missing / bad fields
# ===================================================================

def test_missing_metadata() -> None:
    try:
        ConfigValidator.validate({"components": []})
    except ValidationError:
        pass
    else:
        raise AssertionError("expected ValidationError")


def test_missing_components() -> None:
    try:
        ConfigValidator.validate({"metadata": {"project": "x", "config_version": "1.0.0"}})
    except ValidationError:
        pass
    else:
        raise AssertionError("expected ValidationError")


def test_bad_semver() -> None:
    try:
        ConfigValidator.validate({
            "metadata": {"project": "x", "config_version": "bad"},
            "components": [{"id": "t", "kind": "text_model", "provider": "openai", "model": "gpt-4", "prompt": "hi"}],
        })
    except ValidationError:
        pass
    else:
        raise AssertionError("expected ValidationError for bad semver")


# ===================================================================
# 2. Dry-Run — all operator kinds succeed
# ===================================================================

def test_dry_run_text_model() -> None:
    result = _run_dry(_minimal_config())
    check_success(result)
    r = result["context"]["results"]["t1"]
    assert r["output"]["dry_run"] is True
    assert "prompt" in r["output"]["validated_payload_keys"]


def test_dry_run_image_model() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "img1",
                "kind": "image_model",
                "provider": "diffusers",
                "model": "sdxl",
                "prompt_ref": "none",
            }
        ],
    }
    result = _run_dry(cfg)
    check_success(result)


def test_dry_run_resize() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "r1",
                "kind": "resize",
                "input_asset": "x",
                "width": 512,
                "height": 512,
            }
        ],
    }
    result = _run_dry(cfg)
    check_success(result)


def test_dry_run_composite() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "c1",
                "kind": "composite",
                "layers": ["a", "b"],
            }
        ],
    }
    result = _run_dry(cfg)
    check_success(result)


def test_dry_run_export() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "e1",
                "kind": "export",
                "target": "html",
                "output_path": "/tmp/x.html",
            }
        ],
    }
    result = _run_dry(cfg)
    check_success(result)


# ===================================================================
# 3. system_prompt flow
# ===================================================================

def test_system_prompt_in_payload() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "t1",
                "kind": "text_model",
                "provider": "openai",
                "model": "gpt-4",
                "prompt": "hello",
                "system_prompt": "You are a cat.",
            }
        ],
    }
    plan = ConfigMapper().map(cfg)
    payload = plan.operators[0].payload
    assert payload["system_prompt"] == "You are a cat."


def test_system_prompt_default_empty() -> None:
    cfg = _minimal_config()
    plan = ConfigMapper().map(cfg)
    payload = plan.operators[0].payload
    assert payload["system_prompt"] == ""


# ===================================================================
# 4. Pipeline result schema matches what repair route expects
# ===================================================================

def test_result_schema_matches_route_contract() -> None:
    """The repair route reads::

        result.context.results['repair-gen'].output.content
        result.context.results['repair-gen'].success
        result.context.results['repair-gen'].error

    Verify the top-level schema keys exist in dry-run output.
    """
    result = _run_dry(_minimal_config())
    ctx = result["context"]
    r = ctx["results"]["t1"]
    # Keys the repair route accesses
    assert isinstance(r["success"], bool)
    assert isinstance(r["output"], dict)  # output is always a dict
    assert r["error"] is None or isinstance(r["error"], str)
    assert isinstance(r["duration_ms"], (int, float))
    assert isinstance(r["component_id"], str)


# ===================================================================
# 5. Multi-component pipeline with depends_on
# ===================================================================

def test_pipeline_executes_all_components() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "prompt-gen",
                "kind": "text_model",
                "provider": "openai",
                "model": "gpt-4",
                "prompt": "generate a prompt",
            },
            {
                "id": "img-gen",
                "kind": "image_model",
                "depends_on": ["prompt-gen"],
                "provider": "diffusers",
                "model": "sdxl",
                "prompt_ref": "prompt-gen",
            },
            {
                "id": "final-export",
                "kind": "export",
                "depends_on": ["img-gen"],
                "target": "html",
                "output_path": "/tmp/out.html",
            },
        ],
    }
    result = _run_dry(cfg)
    assert result["status"] == "ok"
    assert set(result["context"]["results"].keys()) == {
        "prompt-gen",
        "img-gen",
        "final-export",
    }


# ===================================================================
# 6. Unknown component kind
# ===================================================================

def test_unknown_component_kind() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [{"id": "x", "kind": "unknown_thing"}],
    }
    try:
        ConfigValidator.validate(cfg)
    except ValidationError:
        pass
    else:
        raise AssertionError("expected ValidationError for unknown kind")


# ===================================================================
# 7. Width / height must be multiple of 8
# ===================================================================

def test_width_not_multiple_of_8() -> None:
    try:
        Params(width=100, height=1024)
    except ValidationError:
        pass
    else:
        raise AssertionError("expected ValidationError for width not multiple of 8")


def test_height_not_multiple_of_8() -> None:
    try:
        Params(width=1024, height=100)
    except ValidationError:
        pass
    else:
        raise AssertionError("expected ValidationError for height not multiple of 8")


# ===================================================================
# 8. Mapper rejects extra fields
# ===================================================================

def test_mapper_rejects_extra_fields() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0", "extra_field": "nope"},
        "components": [{"id": "t", "kind": "text_model", "provider": "openai", "model": "gpt-4", "prompt": "hi"}],
    }
    try:
        ConfigMapper().map(cfg)
    except ValidationError:
        pass
    else:
        raise AssertionError("expected ValidationError for extra field")


# ===================================================================
# 9. Checkpoint store writes and loads
# ===================================================================

def test_checkpoint_write_and_load() -> None:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        ckpt_path = f.name

    try:
        # Remove the empty file so CheckpointStore.load() returns None
        os.unlink(ckpt_path)

        store = CheckpointStore(ckpt_path)
        state = store.load()
        assert state is None, "should be None on first load"

        # Run a dry pipeline
        orch = PipelineOrchestrator(
            mapper=ConfigMapper(),
            registry=OperatorRegistry(dry_run=True),
            checkpoint_store=CheckpointStore(ckpt_path),
        )
        result = orch.run(
            raw_config={
                "metadata": {"project": "test", "config_version": "1.0.0"},
                "components": [{"id": "t", "kind": "text_model", "provider": "openai", "model": "gpt-4", "prompt": "hi"}],
            },
            run_id="checkpoint-test",
            resume=False,
        )
        assert result["status"] == "ok"

        # Load the checkpoint and verify completed steps
        restored = CheckpointStore(ckpt_path).load()
        assert restored is not None
        assert "validate_params" in restored.completed_steps
        assert "operator:t" in restored.completed_steps
    finally:
        if os.path.exists(ckpt_path):
            os.unlink(ckpt_path)


# ===================================================================
# 10. Orchestrator resume skips completed steps
# ===================================================================

def test_orchestrator_resume_skips_completed() -> None:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        ckpt_path = f.name

    try:
        store = CheckpointStore(ckpt_path)
        # Manually inject a checkpoint that marks "validate_params" as done
        from core.orchestrator import PipelineState
        store.save(PipelineState(
            run_id="resume-test",
            current_step=None,
            completed_steps=["load_assets", "validate_params"],
        ))

        orch = PipelineOrchestrator(
            mapper=ConfigMapper(),
            registry=OperatorRegistry(dry_run=True),
            checkpoint_store=CheckpointStore(ckpt_path),
        )
        result = orch.run(
            raw_config={
                "metadata": {"project": "test", "config_version": "1.0.0"},
                "components": [{"id": "t", "kind": "text_model", "provider": "openai", "model": "gpt-4", "prompt": "hi"}],
            },
            run_id="resume-test",
            resume=True,
        )
        assert result["status"] == "ok"
        # The operator step should still run (was not in completed_steps)
        assert "t" in result["context"]["results"]
    finally:
        os.unlink(ckpt_path)


# ===================================================================
# 11. Dry-run operator never calls real AI
# ===================================================================

def test_dry_operator_never_calls_real_ai() -> None:
    op = DryRunOperator()
    from core.mapper import InternalOperatorParams
    from core.schemas import ComponentKind
    params = InternalOperatorParams(
        component_id="test",
        operator=ComponentKind.TEXT_MODEL,
        payload={"provider": "openai", "model": "gpt-4", "prompt": "hi"},
    )
    result = op.run(params, PipelineContext())
    assert result.success
    assert result.output.get("dry_run") is True
    # The output should NOT contain real AI response fields
    assert "content" not in result.output


# ===================================================================
# 12. Real unavailable operators fail instead of pretending success
# ===================================================================

def test_real_image_model_fails_when_not_implemented() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "img",
                "kind": "image_model",
                "provider": "diffusers",
                "model": "sdxl",
                "prompt_ref": "missing",
            }
        ],
    }
    _expect_failure(lambda: _run_real(cfg), "not implemented")


def test_real_resize_fails_when_not_implemented() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "assets": [{"id": "source", "path": "assets/source.png"}],
        "components": [
            {
                "id": "resize",
                "kind": "resize",
                "input_asset": "source",
                "width": 512,
                "height": 512,
            }
        ],
    }
    _expect_failure(lambda: _run_real(cfg), "not implemented")


def test_real_composite_fails_when_not_implemented() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "assets": [
            {"id": "a", "path": "assets/a.png"},
            {"id": "b", "path": "assets/b.png"},
        ],
        "components": [
            {
                "id": "composite",
                "kind": "composite",
                "layers": ["a", "b"],
            }
        ],
    }
    _expect_failure(lambda: _run_real(cfg), "not implemented")


def test_real_non_html_export_fails_when_not_implemented() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "export",
                "kind": "export",
                "target": "png",
                "output_path": "output/test.png",
            }
        ],
    }
    _expect_failure(lambda: _run_real(cfg), "not implemented")


# ===================================================================
# 13. Dependency graph validation
# ===================================================================

def test_missing_dependency_fails_before_operator_execution() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "img",
                "kind": "image_model",
                "depends_on": ["missing"],
                "provider": "diffusers",
                "model": "sdxl",
                "prompt_ref": "missing",
            }
        ],
    }
    _expect_failure(lambda: _run_dry(cfg), "missing dependency")


def test_dependency_cycle_fails_before_operator_execution() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "1.0.0"},
        "components": [
            {
                "id": "a",
                "kind": "text_model",
                "depends_on": ["b"],
                "provider": "openai",
                "model": "gpt-4",
                "prompt": "a",
            },
            {
                "id": "b",
                "kind": "text_model",
                "depends_on": ["a"],
                "provider": "openai",
                "model": "gpt-4",
                "prompt": "b",
            },
        ],
    }
    _expect_failure(lambda: _run_dry(cfg), "dependency cycle")


# ===================================================================
# 14. Config validation returns structured details
# ===================================================================

def test_validation_error_has_structured_details() -> None:
    cfg = {
        "metadata": {"project": "test", "config_version": "bad"},
        "components": [{"id": "t", "kind": "text_model", "provider": "openai", "model": "gpt-4", "prompt": "hi"}],
    }
    try:
        ConfigValidator.validate(cfg)
    except ValidationError as exc:
        errors = exc.errors()
        assert len(errors) > 0
        # Pydantic errors have loc, msg, type
        assert "loc" in errors[0]
        assert "msg" in errors[0]
        assert "type" in errors[0]
    else:
        raise AssertionError("expected ValidationError")


# ===================================================================
# Run standalone (without pytest)
# ===================================================================

_TESTS = [
    ("missing_metadata", test_missing_metadata),
    ("missing_components", test_missing_components),
    ("bad_semver", test_bad_semver),
    ("dry_run_text_model", test_dry_run_text_model),
    ("dry_run_image_model", test_dry_run_image_model),
    ("dry_run_resize", test_dry_run_resize),
    ("dry_run_composite", test_dry_run_composite),
    ("dry_run_export", test_dry_run_export),
    ("system_prompt_in_payload", test_system_prompt_in_payload),
    ("system_prompt_default_empty", test_system_prompt_default_empty),
    ("result_schema_matches_route_contract", test_result_schema_matches_route_contract),
    ("pipeline_executes_all_components", test_pipeline_executes_all_components),
    ("unknown_component_kind", test_unknown_component_kind),
    ("width_not_multiple_of_8", test_width_not_multiple_of_8),
    ("height_not_multiple_of_8", test_height_not_multiple_of_8),
    ("mapper_rejects_extra_fields", test_mapper_rejects_extra_fields),
    ("checkpoint_write_and_load", test_checkpoint_write_and_load),
    ("orchestrator_resume_skips_completed", test_orchestrator_resume_skips_completed),
    ("dry_operator_never_calls_real_ai", test_dry_operator_never_calls_real_ai),
    ("real_image_model_fails_when_not_implemented", test_real_image_model_fails_when_not_implemented),
    ("real_resize_fails_when_not_implemented", test_real_resize_fails_when_not_implemented),
    ("real_composite_fails_when_not_implemented", test_real_composite_fails_when_not_implemented),
    ("real_non_html_export_fails_when_not_implemented", test_real_non_html_export_fails_when_not_implemented),
    ("missing_dependency_fails_before_operator_execution", test_missing_dependency_fails_before_operator_execution),
    ("dependency_cycle_fails_before_operator_execution", test_dependency_cycle_fails_before_operator_execution),
    ("validation_error_has_structured_details", test_validation_error_has_structured_details),
]


def main() -> int:
    failed = 0
    for name, fn in _TESTS:
        try:
            fn()
            print(f"  PASS  {name}")
        except Exception as exc:
            print(f"  FAIL  {name}  —  {exc}")
            failed += 1
    print(f"\n{len(_TESTS) - failed}/{len(_TESTS)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
