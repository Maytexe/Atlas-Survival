from dataclasses import dataclass


@dataclass
class ProblemError(Exception):
    status: int
    title: str
    detail: str
    type: str = "about:blank"


def not_found(detail: str) -> ProblemError:
    return ProblemError(404, "Não encontrado", detail)


def conflict(detail: str) -> ProblemError:
    return ProblemError(409, "Conflito", detail)


def invalid(detail: str) -> ProblemError:
    return ProblemError(422, "Dados inválidos", detail)
