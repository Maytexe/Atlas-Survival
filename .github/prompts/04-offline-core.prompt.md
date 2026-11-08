---
description: Etapa 4 — Camada offline (sem telas finais)
agent: agent
---
Execute SOMENTE a etapa 4, seguindo #file:docs/SPEC.md §3 e §6.
- Dexie: schema espelhando o SPEC, mais outbox e meta (cursor, last_sync).
- Repositories: toda escrita é uma transação Dexie (entidade + outbox).
- `src/domain`: porte das funções puras, passando nos MESMOS fixtures (Vitest).
- Sync engine com gatilhos, backoff, checagem real de conectividade e os 4 estados.
- vite-plugin-pwa (registerType 'prompt', precache do shell) e navigator.storage.persist().
- Tipos da API gerados do OpenAPI.
Pronto quando: testes (fake-indexeddb) cobrem outbox, retry, idempotência e stale, e o app abre
offline após o primeiro carregamento.
Reporte e pare.