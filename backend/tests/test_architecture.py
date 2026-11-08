import ast
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1] / "app"


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module is not None:
            imports.add(node.module)
            imports.update(f"{node.module}.{alias.name}" for alias in node.names)
    return imports


def _imports_under(directory: str) -> set[str]:
    return set().union(*(_imports(path) for path in (APP_ROOT / directory).rglob("*.py")))


def test_architecture_import_boundaries() -> None:
    forbidden_roots = {"sqlalchemy", "fastapi", "pydantic"}
    forbidden_app_modules = {
        "app.models",
        "app.schemas",
        "app.services",
        "app.api",
        "app.db",
    }
    imports = _imports_under("domain")
    violations = sorted(
        name
        for name in imports
        if name.split(".", maxsplit=1)[0] in forbidden_roots
        or any(name == module or name.startswith(f"{module}.") for module in forbidden_app_modules)
    )
    failures = {"app/domain": violations} if violations else {}
    service_violations = sorted(
        name
        for name in _imports_under("services")
        if name == "app.api" or name.startswith("app.api.")
    )
    if service_violations:
        failures["app/services"] = service_violations
    forbidden = ("app.services", "app.api", "app.schemas")
    model_violations = sorted(
        name
        for name in _imports_under("models")
        if any(name == module or name.startswith(f"{module}.") for module in forbidden)
    )
    if model_violations:
        failures["app/models"] = model_violations
    assert not failures, f"Imports proibidos nos limites de arquitetura: {failures}"
