---
description: Etapa 3 — Domínio, services e API
agent: agent
---
Execute SOMENTE a etapa 3, em TDD, seguindo #file:docs/SPEC.md §2, §3, §4 e §6.
1. Escreva primeiro os fixtures em shared/fixtures e os testes pytest que os consomem; depois
   implemente `domain/` (funções puras com `today` injetado).
2. Services com transações e exceções de domínio.
3. Routers do SPEC §4 (incluindo sync push/pull) e handler de Problem Details.
4. Testes de API com httpx.AsyncClient + Postgres real (404/409/422, idempotência, tombstones).
Pronto quando: ruff, mypy e pytest passam e o OpenAPI está exportado em shared/openapi.json.
Reporte e pare.