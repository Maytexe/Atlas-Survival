# ATLAS

Gestão doméstica de sobrevivência e emergências: pessoas e animais, estoque de
alimentos e água, validades, alertas e autonomia estimada. Offline-first — a
interface lê e escreve no IndexedDB; a rede só sincroniza com o servidor.

Especificação: [`docs/SPEC.md`](docs/SPEC.md). Regras para agentes:
[`AGENTS.md`](AGENTS.md). Cards de evolução: [`docs/cards/`](docs/cards/).

## Pré-requisitos

| Ferramenta | Uso |
|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | PostgreSQL via Compose |
| [uv](https://docs.astral.sh/uv/) | Python 3.12+, dependências e Alembic |
| [Node.js](https://nodejs.org/) LTS (npm) | Frontend |
| [just](https://github.com/casey/just) | Atalhos do repositório |

Ambiente alvo: Windows 11 + PowerShell. Os comandos abaixo funcionam nesse shell.

## Primeiro setup

Na raiz do repositório:

```powershell
Copy-Item .env.example .env
uv sync --directory backend
npm --prefix frontend install
just db-up
just migrate
```

O `.env` traz credenciais só para desenvolvimento local. Altere a senha antes de
expor o banco a qualquer rede.

## Subir o ambiente

Tudo de uma vez (Postgres + API + Vite, cada serviço numa janela):

```powershell
just dev
```

Ou por partes:

```powershell
just db-up          # PostgreSQL em 127.0.0.1:5432
just migrate        # aplica migrações Alembic
just backend-dev    # API em http://127.0.0.1:8000
just frontend-dev   # UI em http://127.0.0.1:5173
```

A Vite faz proxy de `/api` para o backend. Health check: `GET /api/health`.

## Validação

```powershell
just backend-check    # ruff, mypy, pytest
just frontend-check   # lint, format, typecheck, tipos gerados, vitest, build
just all              # os dois acima
just e2e              # sobe o banco e roda o script E2E do backend
```

E2E do Playwright (fluxo da SPEC §7), a partir de `frontend/`:

```powershell
npm --prefix frontend run e2e
```

## OpenAPI e tipos

Depois de mudar a API:

```powershell
just openapi   # regenera shared/openapi.json
just types     # regenera frontend/src/types/api.generated.ts
```

## PWA, offline e celular

- Em `npm run dev` o service worker **não** é confiável para testar offline. Use o
  build e o preview:

  ```powershell
  npm --prefix frontend run build
  npm --prefix frontend run preview
  ```

- Duas instâncias do Vite ao mesmo tempo ocupam as portas **5173** e **5174**;
  feche a sobra se o app “sumir” ou o CORS falhar.

- Para instalar no celular na mesma rede, o navegador costuma exigir HTTPS. O
  Vite aceita certificados locais:

  ```powershell
  # exemplo com mkcert (instale o mkcert antes)
  mkcert -install
  mkcert localhost 127.0.0.1 ::1 SEU_IP_LAN
  ```

  Em `frontend/.env.local` (não versionado):

  ```
  HTTPS_KEY_FILE=./localhost+3-key.pem
  HTTPS_CERT_FILE=./localhost+3.pem
  ```

  Ajuste os nomes dos arquivos ao que o `mkcert` gerar e inclua a origem HTTPS
  do celular em `CORS_ORIGINS` no `.env` da raiz. A API continua em
  `127.0.0.1` por padrão — no celular você acessa só a UI; o proxy do Vite
  encaminha `/api`.

- No aparelho: abra a URL HTTPS → menu do navegador → “Adicionar à tela inicial”
  / “Instalar app”.

## Backup e ficha de emergência

Em **Configurações** (e atalhos relacionados na UI):

- **Exportar backup JSON** — cópia local dos dados do aparelho.
- **Importar backup JSON** — grava no IndexedDB e envia na próxima sincronização.
- **Ficha de emergência** — visão imprimível para papel.

Dados críticos não devem depender só do servidor: mantenha backup periódico.

## Estrutura

```
backend/     FastAPI, SQLAlchemy async, Alembic
frontend/    React + Vite + Dexie (PWA)
shared/      fixtures de domínio + OpenAPI
docs/        SPEC, decisões, backlog, cards
```

## Limitações conhecidas (MVP)

- **Sem autenticação.** O servidor escuta em `127.0.0.1` por padrão; CORS vem do
  `.env`. Não exponha na rede sem proteção (ver card C12).
- **Relógios.** O sync usa timestamps do cliente; aparelhos com relógio errado
  podem gerar conflitos ou ordenação estranha.
- **Metas de autonomia** são por aparelho (entram no backup JSON; não sincronizam).
- **Correção absoluta de quantidade** (UPDATE) pode sobrescrever consumos
  concorrentes (ADJUST) de outro dispositivo — limitação aceita do LWW.
- **Primeiro uso offline** sem dados locais: o app explica que a primeira carga
  precisa de rede.

## Licença / uso

Projeto doméstico offline-first. Não é orientação médica: números de referência
de saúde ou água, quando aparecerem em cards futuros, citam a fonte e exigem
escolha explícita do usuário.
