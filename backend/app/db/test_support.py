from sqlalchemy.engine import make_url


def require_test_database_url(database_url: str) -> str:
    parsed_url = make_url(database_url)
    if parsed_url.database is None or not parsed_url.database.endswith("_test"):
        raise RuntimeError(
            "Os testes exigem DATABASE_URL apontando para um banco cujo nome termine em _test."
        )
    return parsed_url.render_as_string(hide_password=False)
