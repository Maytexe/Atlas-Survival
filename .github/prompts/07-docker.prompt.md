---
description: Etapa 7 — Docker Compose completo (modo servidor da casa)
agent: agent
---
Execute SOMENTE a etapa 7. Leia #file:AGENTS.md, #file:docs/SPEC.md, docs/decisions/* e o README.

Objetivo: `just up` sobe PostgreSQL + backend + web numa rede do Compose, para rodar o ATLAS como
"servidor da casa". O desenvolvimento continua LOCAL (uv, npm, just). O `docker compose up -d`
atual (só Postgres) deve continuar funcionando igual.

## Decisão a registrar
Atualize o AGENTS.md: a regra "Compose apenas com PostgreSQL" passa a "Postgres no
desenvolvimento; app completo no profile `app`". Registre no próximo número livre de
docs/decisions (máx. 30 linhas).

## Entregas
1. backend/Dockerfile multi-stage: imagem do uv, `uv sync --frozen --no-dev`, usuário não-root,
   HEALTHCHECK em /api/health, ENVIRONMENT=production. Entrypoint: `alembic upgrade head` e depois
   uvicorn (sem --reload). Sem seed. .dockerignore (.venv, __pycache__, tests, .env).
2. frontend/Dockerfile multi-stage: `npm ci` + `npm run build` → imagem Caddy. Caddyfile: serve o
   build com fallback SPA (try_files → /index.html), reverse_proxy de /api/* para backend:8000 e
   cabeçalhos: `no-cache` para index.html, sw.js, registerSW.js e manifest.webmanifest;
   `immutable` para /assets/*; X-Content-Type-Options, Referrer-Policy e uma CSP compatível com o
   app (sem CDN, sem fontes externas). .dockerignore (node_modules, dist).
3. docker-compose.yml: serviços `backend` e `web` com `profiles: ["app"]`, `restart:
   unless-stopped`, healthchecks e `depends_on` com `condition: service_healthy`. SOMENTE `web`
   publica porta: `${WEB_BIND_ADDRESS:-127.0.0.1}:${WEB_PORT:-8080}`. O backend não publica porta.
   O Postgres continua em 127.0.0.1:5432 (só a própria máquina; usado no desenvolvimento local).
   DATABASE_URL do container aponta para o serviço `postgres`. Segredos só via .env; atualize o
   .env.example, comentado.
4. HTTPS: Caddy com `tls internal` em porta separada (ex.: 8443), ativável por variável. Documente
   como obter o certificado raiz do Caddy e instalá-lo no Android e no iOS. Descreva (sem
   implementar) a alternativa de VPN privada, como o Tailscale.
5. justfile: up (`docker compose --profile app up -d --build`), down, logs, ps e smoke.
6. Segurança: o padrão é só 127.0.0.1. Abrir para a rede local exige WEB_BIND_ADDRESS=0.0.0.0
   conscientemente. O README avisa que o MVP NÃO tem autenticação (qualquer um na rede lê e altera
   o estoque) e que os locais de armazenamento são dados sensíveis.
7. README, seção "Rodar como servidor da casa": subir, atualizar (`just up` depois de git pull),
   logs, backup e restauração (reaproveite db-backup e db-restore), instalar o PWA no celular via
   HTTPS, firewall do Windows, e a observação de que o Docker Desktop só sobe quando o usuário
   entra no Windows (para um servidor 24h, prefira Linux).

## Prova
- Em ambiente de teste: `docker compose down -v`, depois `just up` do zero e `just smoke`, que
  verifica: GET /api/health via web = 200; GET /estoque = 200 com HTML (fallback SPA); sw.js com
  Cache-Control no-cache; /assets/*.js com immutable; porta do backend inacessível pelo host.
- Reinicie o backend e confirme que os dados persistem (volume nomeado).
- Rode `just frontend-check`, `just backend-check` e `just e2e` (o fluxo local não pode quebrar).
Não faça commit. Reporte e pare.