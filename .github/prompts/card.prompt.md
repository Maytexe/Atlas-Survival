---
description: Implementar um card de docs/cards (anexe o card com #file:)
agent: agent
---
Implemente SOMENTE o card anexado a esta conversa (um arquivo de docs/cards/). Se não houver card
anexado, pare e peça. Leia #file:AGENTS.md, #file:docs/SPEC.md, as instruções em
.github/instructions/, docs/decisions/* e docs/cards/README.md (regras comuns, que valem para todo card).

## Antes de codar
1. Mostre um plano curto: arquivos que mudam, se há migração, impacto no sync e no OpenAPI, e o que
   o card deixa de fora. Se o card depender de outro ainda não implementado, PARE e me avise.
2. Atualize o SPEC (e registre um ADR no próximo número livre, até 30 linhas) quando o card pedir.

## Como fazer
3. TDD. Regra nova: escreva primeiro os fixtures em shared/fixtures/ e os testes, mostre-os FALHANDO,
   implemente em Python e em TypeScript (domínio puro, Decimal/decimal.js, `today` injetado) até os
   MESMOS fixtures passarem nos dois lados.
4. Mudança de banco: migração Alembic revisada à mão, `alembic check` limpo, schemas, push e pull do
   sync, Dexie em nova versão com migração local, `just openapi` e `just types`. Backup JSON antigo
   precisa continuar válido.
5. Interface: pt-BR simples, InfoTip nas explicações, unidades amigáveis, alvos ≥ 48px, estados
   vazio, carregando e erro, contraste AA nos 3 temas. Nenhuma regra de negócio só no frontend.
6. Nunca invente valores padrão; referências só como sugestão rotulada, escolhida pelo usuário.

## Prova
7. `just backend-check` e `just frontend-check` verdes (e `just e2e` quando existir; inclua ou
   atualize o teste E2E do fluxo principal do card). Mostre os testes falhando antes e passando depois,
   e o diff do OpenAPI quando mudar.
8. Não faça commit. Reporte arquivos alterados, resultados dos gates e pendências. Pare.
