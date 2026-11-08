import pytest
from database_support import require_test_database_url


def test_test_database_url_rejects_development_database(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+asyncpg://atlas:secret@127.0.0.1:5432/atlas",
    )

    with pytest.raises(RuntimeError, match="termine em _test"):
        require_test_database_url("postgresql+asyncpg://atlas:secret@127.0.0.1:5432/atlas")
