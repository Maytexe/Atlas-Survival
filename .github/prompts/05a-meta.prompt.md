---
description: Etapa 5a — Meta de autonomia em dias (regra nova, backend + frontend)
agent: agent
---
Execute SOMENTE a etapa 5a. Leia #file:AGENTS.md, #file:docs/SPEC.md (§2, §3, §5), as instruções em
.github/instructions/ e docs/decisions/004-sync-cliente.md.

Objetivo: o usuário define uma META DE DIAS para água e para comida ("quero aguentar 3 dias") e o
app avisa se o estoque atual é suficiente e, se não for, quanto falta. É a ÚNICA regra de negócio
nova desta rodada. Nada de interface final aqui: a etapa 5b faz as telas.

## Regra (escreva no SPEC §2 ANTES de codar)
- Meta = número inteiro de dias (1 a 365), uma para ÁGUA e outra para COMIDA; cada uma é opcional.
  Sem meta definida = sem avaliação. NUNCA invente um valor padrão.
- A avaliação é por grupo de autonomia (tipo + dimensão, e unidade-base para COUNT), usando apenas
  itens com consumo informado e lotes dentro da validade (as mesmas regras da autonomia).
- Para cada grupo: `needed_base = meta_dias × consumo_diário_base_do_grupo`;
  `missing_base = max(0, needed_base − disponível_base)`, arredondado PARA CIMA para a unidade-base
  inteira (ml, g, unidade).
- Status: NO_GOAL (sem meta) | NO_DATA (nenhum item do grupo com consumo) | MET (disponível ≥
  necessário) | BELOW (disponível < necessário). Inclua `partial_coverage` (verdadeiro se algum
  item do grupo não tem consumo informado) e a cobertura X de Y.
- Novo alerta BELOW_GOAL (gravidade ATENÇÃO), um por grupo em status BELOW, com o texto "faltam X
  para N dias". Só existe se a meta foi informada.
- A meta é uma preferência POR APARELHO, guardada junto das demais configurações do frontend e
  incluída no backup JSON. Sincronizar metas entre aparelhos vai para docs/BACKLOG.md; registre a
  limitação no SPEC.

## Entregas (TDD: testes primeiro, mostre-os FALHANDO)
1. SPEC atualizado (§2 regra e alerta; §5 onde a meta é configurada) e o fixture novo
   shared/fixtures/goal-cases.json (entrada e saída) com as bordas: meta exata (MET), um a menos
   (BELOW), disponível zero, sem consumo (NO_DATA), sem meta, cobertura parcial, lote vencido não
   conta, COUNT separado de MASS e VOLUME, arredondamento para cima. Estenda alerts-cases.json com
   BELOW_GOAL.
2. Python: backend/app/domain/goals.py (puro, Decimal, sem I/O) e integração em alerts. Se
   `aggregate_autonomy` ainda não expõe `available_base` e `daily_base` por grupo, exponha-os
   (atualize os fixtures e testes afetados).
3. TypeScript: src/domain/goals.ts espelhando o Python, lendo OS MESMOS fixtures, com decimal.js.
4. API: parâmetros OPCIONAIS `goal_water_days` e `goal_food_days` (inteiros 1–365; 422 se
   inválidos) em GET /api/dashboard e GET /api/alerts. O dashboard devolve a lista `goals` (vazia
   sem metas). Quem não envia os parâmetros recebe o mesmo contrato de hoje. Reexporte
   shared/openapi.json (`just openapi`) e regenere os tipos (`just types`).
5. Frontend: hook `useGoals()` (ler e gravar metas nas configurações; validação 1–365; vazio =
   sem meta), incluído no export e no import de backup (backup antigo sem metas continua válido), e
   um seletor que devolve a avaliação por grupo a partir dos dados locais. SEM telas nesta etapa,
   só dois campos numéricos simples em Configurações para permitir o teste.

## Pronto quando
`just backend-check` e `just frontend-check` verdes (incluindo test_architecture). Mostre os testes
falhando antes e passando depois, e o diff do OpenAPI: só os parâmetros opcionais novos, o valor
BELOW_GOAL no enum de alertas e o campo `goals`. Não faça commit. Reporte e pare.