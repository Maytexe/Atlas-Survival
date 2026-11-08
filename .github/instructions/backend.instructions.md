---
applyTo: "backend/**/*.py"
---
- SQLAlchemy 2.0 tipado (`Mapped[...]`, `mapped_column`); `Numeric(14,3)` para quantidades;
  `CheckConstraint` para regras que o banco pode garantir; `naming_convention` no metadata.
- Async de ponta a ponta; uma `AsyncSession` por request via `Depends`; `expire_on_commit=False`.
- Camadas: router (fino) → service (transação e orquestração) → `domain/` (funções puras).
  Router nunca contém regra de negócio.
- Pydantic v2: schemas de entrada e saída separados, `extra="forbid"`,
  `Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=3)]`, Decimal serializado como string.
- Exceções de domínio (`NotFoundError`, `ConflictError`, `RuleViolationError`) convertidas em
  Problem Details por um handler central: 400, 404, 409, 422, 500.
- Operação que toca mais de uma tabela roda em uma única transação.
- Config só via pydantic-settings. Sem `print`, sem `except Exception` genérico.
- Testes: httpx.AsyncClient + Postgres real, rollback por teste, `today` injetado (nada de
  `datetime.now()` dentro do domínio). Property-based com hypothesis nas regras de cálculo.