# 001 - Plano aprovado

- Fonte de verdade: [docs/SPEC.md](../SPEC.md) e [AGENTS.md](../../AGENTS.md). [docs/PROJECT.MD](../PROJECT.MD) foi ignorado por estar obsoleto.
- Árvore final (conceitual; sem implementação):
  - root: .env.example, docker-compose.yml, justfile, README.md
  - backend: pyproject.toml, uv.lock, alembic.ini, app/, scripts/seed_dev.py, alembic/
  - frontend: package.json, e2e/, src/pages/, src/components/, src/hooks/, src/services/, src/domain/, src/db/, src/store/, src/types/, src/i18n/, src/pwa/
  - shared: fixtures/, openapi.json
  - docs: SPEC.md, decisions/
- Ordem das etapas (exata):
  1. Etapa 1: fundação e estrutura.
  2. Etapa 2: dados e migrações.
  3. Etapa 3: backend + sync push/pull.
  4. Etapa 4: frontend offline (Dexie, outbox, sync engine, domain TS, PWA).
  5. Etapa 5: UI, backup JSON e Ficha de emergência.
  6. Etapa 6: Playwright, README e fechamento.
- Critério de pronto de cada etapa: comandos de validação do AGENTS.md.
- Decisões aprovadas:
  - `client_updated_at` em todas as tabelas sincronizáveis; LWW usa `mutation.client_ts >= record.client_updated_at`.
  - Unidades permitidas: kg, g, L, ml, unidade, pacote, lata, garrafa.
  - Mutação CREATE rejeitada gera `blocked` para dependências posteriores e alvo em "Pendências com erro".
  - `deleted_at` é tombstone; sem restauração de registros.
  - Regras de domínio ficam em `backend/app/domain/` e `frontend/src/domain/`; `shared/` só contém fixtures e openapi.
  - `shared/fixtures/*` por caso, em arquivos separados (expiry, units, availability, autonomy, alerts).
  - Frontend usa `pages/ components/ hooks/ services/ domain/ db/ store/ types/ i18n/ pwa/`.
  - `backend/app/logic/` renomeado para `backend/app/domain/`; `frontend/src/features/auth` removido do escopo.
  - `justfile` na raiz, sem Makefile; `pyproject.toml` e `uv.lock` em `backend/`.
