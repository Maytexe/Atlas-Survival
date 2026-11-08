import json
from pathlib import Path
from typing import Any

from app.main import app


def test_exported_openapi_matches_current_api() -> None:
    openapi_path = Path(__file__).resolve().parents[2] / "shared" / "openapi.json"
    expected = (
        json.dumps(
            app.openapi(),
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )
    actual: Any = openapi_path.read_text(encoding="utf-8")

    assert actual == expected, "Execute `just openapi` para atualizar shared/openapi.json."
