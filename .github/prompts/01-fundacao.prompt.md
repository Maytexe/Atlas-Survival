---
description: Etapa 1 — Fundação
agent: agent
---
Execute SOMENTE a etapa 1, seguindo #file:AGENTS.md e #file:docs/SPEC.md.
Criar:
- Estrutura backend/frontend/shared/docs.
- docker-compose.yml só com PostgreSQL (healthcheck, volume nomeado, porta em 127.0.0.1,
  credenciais via .env) e .env.example completo e comentado.
- Backend: pyproject (uv), core/config (pydantic-settings), engine e session async, main.py com
  /api/health, CORS restrito por env, logging.
- Frontend: Vite + React + TS strict, ESLint, Prettier, Vitest, estilização escolhida, alias @/.
- Makefile ou justfile (dev, test, lint, db-up, migrate).
- .github/workflows/ci.yml (lint + typecheck + test com serviço Postgres) e README inicial.
Fora de escopo: models, telas, PWA.
Pronto quando: `docker compose up -d` saudável, GET /api/health = 200, os comandos de
validação rodam sem erro de configuração e `npm run build` passa.
Reporte arquivos, resultados e pendências. Pare.