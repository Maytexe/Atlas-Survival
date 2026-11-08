# ATLAS

Aplicativo offline-first para gestão doméstica de sobrevivência e emergências.
A especificação funcional está em [docs/SPEC.md](docs/SPEC.md).

## Requisitos

- Windows 11, PowerShell 5.1
- Python 3.12 (gerenciado pelo `uv`), Node.js 22 ou superior
- `uv`, `just` e Docker Compose

## Preparar ambiente

Na raiz do repositório, copie o exemplo de ambiente e suba o PostgreSQL:

```powershell
Copy-Item .env.example .env
just db-up
```

O banco fica disponível somente em `127.0.0.1`. As credenciais do `.env.example`
são exclusivas para desenvolvimento local.

## Desenvolvimento e validação

- `just dev`: inicia o PostgreSQL e os servidores de desenvolvimento do backend e frontend.
- `just backend-check`: Ruff, mypy strict e pytest.
- `just frontend-check`: ESLint, Prettier, TypeScript, Vitest e build.
- `just test` / `just lint`: testes ou lint nos dois projetos.
- `just migrate`: aplica as migrações Alembic disponíveis.
- `just e2e`: reservado para a suíte Playwright da Etapa 6.
- `just all`: executa `backend-check` e `frontend-check`.

O frontend usa CSS Modules para estilos isolados.

A API escuta em `127.0.0.1:8000`; `GET /api/health` retorna o status da API.
O Vite escuta em `127.0.0.1:5173`. Configure `CORS_ORIGINS` no `.env` para
restringir as origens permitidas. O MVP não possui autenticação.

## Limitações aceitas

Uma correção manual absoluta de quantidade é uma operação UPDATE sujeita a LWW.
Como ADJUST (consumo) é comutativo e não altera `client_updated_at`, uma correção
absoluta pode sobrescrever ajustes concorrentes feitos em outro dispositivo. Use
ADJUST para consumo e UPDATE apenas para corrigir manualmente a quantidade.
Relógios divergentes entre dispositivos também podem afetar a resolução LWW.
