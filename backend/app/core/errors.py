import logging
from dataclasses import dataclass
from typing import cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ExceptionHandler

logger = logging.getLogger(__name__)


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


def _problem_response(
    *,
    status_code: int,
    title: str,
    detail: str,
    instance: str | None = None,
    problem_type: str = "about:blank",
) -> JSONResponse:
    body = {
        "type": problem_type,
        "title": title,
        "status": status_code,
        "detail": detail,
    }
    if instance is not None:
        body["instance"] = instance
    return JSONResponse(
        status_code=status_code,
        content=body,
        media_type="application/problem+json",
    )


def install_problem_handlers(app: FastAPI) -> None:
    async def handle_problem_error(request: Request, error: ProblemError) -> JSONResponse:
        return _problem_response(
            status_code=error.status,
            title=error.title,
            detail=error.detail,
            instance=request.url.path,
            problem_type=error.type,
        )

    async def handle_validation_error(
        request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        del error
        return _problem_response(
            status_code=422,
            title="Dados inválidos",
            detail="Revise os dados enviados e tente novamente.",
            instance=request.url.path,
        )

    async def handle_integrity_error(
        request: Request,
        error: IntegrityError,
    ) -> JSONResponse:
        del error
        return _problem_response(
            status_code=409,
            title="Conflito",
            detail="A operação viola uma restrição dos dados.",
            instance=request.url.path,
        )

    async def handle_http_error(
        request: Request,
        error: StarletteHTTPException,
    ) -> JSONResponse:
        titles = {400: "Solicitação inválida", 404: "Não encontrado"}
        detail = (
            error.detail
            if isinstance(error.detail, str)
            else "A solicitação não pode ser atendida."
        )
        return _problem_response(
            status_code=error.status_code,
            title=titles.get(error.status_code, "Erro na solicitação"),
            detail=detail,
            instance=request.url.path,
        )

    async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
        logger.error(
            "Erro interno ao processar %s",
            request.url.path,
            exc_info=(type(error), error, error.__traceback__),
        )
        return _problem_response(
            status_code=500,
            title="Erro interno",
            detail="Ocorreu um erro interno. Tente novamente.",
            instance=request.url.path,
        )

    app.add_exception_handler(ProblemError, cast(ExceptionHandler, handle_problem_error))
    app.add_exception_handler(
        RequestValidationError,
        cast(ExceptionHandler, handle_validation_error),
    )
    app.add_exception_handler(IntegrityError, cast(ExceptionHandler, handle_integrity_error))
    app.add_exception_handler(
        StarletteHTTPException,
        cast(ExceptionHandler, handle_http_error),
    )
    app.add_exception_handler(Exception, cast(ExceptionHandler, handle_unexpected_error))
