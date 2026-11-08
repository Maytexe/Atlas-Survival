---
applyTo: "backend/**/*.py"
---
- Organize `app/` by responsibility: `core/{config,errors,clock}.py`;
  `db/{engine,session,writes}.py`;
  `models/{base,enums,mixins,member,category,inventory_item,stock_batch,processed_mutation}.py`
  (os enums de domínio têm definição única em `domain/enums.py`);
  `schemas/{common,member,category,inventory,batch,dashboard,alert,sync}.py`;
  `domain/{enums,types,units,expiry,availability,consumption,autonomy,alerts,dashboard}.py`;
  regras recebem snapshots tipados e imutáveis;
  `services/{member,category,inventory,batch,dashboard,alert,messages,records,registry}.py` and
  `services/sync/{push,pull}.py`; `api/{deps,router}.py` and
  `api/routes/{health,members,categories,inventory,batches,dashboard,alerts,sync}.py`.
- Keep each `backend/app` Python file at approximately 250 lines or fewer.
- `models/__init__.py` and `schemas/__init__.py` reexport their public names.
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