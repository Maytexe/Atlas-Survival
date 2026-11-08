---
description: Etapa 2 — Models e Alembic
agent: agent
---
Execute SOMENTE a etapa 2 (#file:docs/SPEC.md §1).
- Models SQLAlchemy 2.0 tipados, constraints, FKs com ON DELETE definido e índices exatamente
  como o SPEC.
- Alembic com template async, compare_type=True e migração inicial revisada à mão.
- scripts/seed_dev.py com dados fictícios SOMENTE para desenvolvimento, claramente marcados.
Pronto quando: `alembic upgrade head` e `downgrade base` funcionam em banco vazio, e um teste
prova que o banco rejeita violação de CHECK e FK.
Reporte e pare.