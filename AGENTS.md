# ATLAS — Gestão doméstica de sobrevivência e emergências

## Missão
App offline-first para controlar pessoas/animais, estoque (alimentos e água), validades,
alertas e autonomia estimada. Deve funcionar sem internet, no celular, sob estresse.

## Escopo
Fonte de verdade: `docs/SPEC.md`. O que não estiver lá NÃO se implementa:
registre a ideia em `docs/BACKLOG.md` e siga.

## Stack (fixa)
- Backend: Python 3.12+, FastAPI, SQLAlchemy 2.0 async (asyncpg), PostgreSQL,
  Pydantic v2 + pydantic-settings, Alembic, Uvicorn. Ferramentas: uv, ruff, mypy (strict), pytest.
- Frontend: React + TypeScript (strict), Vite, Dexie (+ dexie-react-hooks), Zustand, Axios,
  React Hook Form + Zod, decimal.js, vite-plugin-pwa (Workbox), Tailwind v4 ou CSS Modules,
  Vitest, Playwright. Confira as versões estáveis atuais ao criar o projeto.
- Infra: Docker Compose apenas com PostgreSQL.
- Proibido: MongoDB, Redis, filas, microsserviços, GraphQL, Firebase/Supabase,
  bibliotecas de UI pesadas, qualquer dependência sem justificativa.

## Princípios inegociáveis
1. Offline-first: a UI lê e escreve SEMPRE no IndexedDB. A rede serve só para sincronizar.
2. Regras de cálculo (validade, disponibilidade, autonomia, alertas) são funções puras,
   sem I/O, com `today` injetado. Existem em Python e em TypeScript e passam nos MESMOS
   fixtures de `shared/fixtures/`.
3. Quantidades: Decimal no backend, string na API, decimal.js no frontend. Nunca float.
4. Nunca invente consumo, calorias ou valores padrão.
5. Erros no formato Problem Details (RFC 9457), mensagens em pt-BR.
6. Dados críticos nunca dependem só da nuvem: sempre há cópia local e exportação JSON.

## Convenções
- Identificadores e código em inglês; UI, mensagens e docs em pt-BR; strings centralizadas
  em `src/i18n/pt-BR.ts`.
- Datas ISO. "Hoje" = fuso America/Sao_Paulo (configurável).
- Commits: Conventional Commits. Sem refatoração nem dependência fora do pedido.

## Validação (rode e reporte antes de dizer "pronto")
- backend: `uv run ruff check . && uv run mypy . && uv run pytest`
- frontend: `npm run lint && npm run typecheck && npm run test && npm run build`
- e2e: `npm run e2e`

## Forma de trabalho
- Uma etapa por vez. Ao final: arquivos criados, saída resumida dos comandos, decisões
  tomadas e pendências. Depois PARE e aguarde aprovação.
- Se algo for ambíguo, escolha a opção mais simples, registre em
  `docs/decisions/NNN-titulo.md` (5 linhas) e continue.

- Ambiente: Windows 11 + PowerShell. Todo comando documentado deve funcionar em PowerShell.
  Não usar Makefile nem scripts bash. Para tarefas, use `just` (justfile) ou scripts do package.json.