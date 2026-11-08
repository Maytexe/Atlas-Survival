# ATLAS — Especificação do MVP

## 1. Modelo de dados
Todas as tabelas têm: `id UUID` (gerado no CLIENTE; o servidor aceita), `created_at`,
`updated_at`, `client_updated_at` (timestamptz, usado no LWW do sync), `change_seq BIGINT`
(sequence global do Postgres, atribuída a cada escrita; base do pull), `deleted_at`
(tombstone só para propagar exclusões; nunca exibir; queries de negócio filtram
`deleted_at IS NULL`). Excluir item = tombstone do item e dos seus lotes, numa transação.

Unidades permitidas (enum fechado): `kg`, `g`, `L`, `ml`, `unidade`, `pacote`, `lata`,
`garrafa`. A dimensão segue a regra do §2: MASS, VOLUME ou COUNT.

- household_members: name, member_type (PERSON|ANIMAL), age (opcional, ≥ 0), notes
- categories: name (único, case-insensitive), description
- inventory_items: name, description, category_id (FK, ON DELETE RESTRICT → 409 se houver itens),
  item_kind (FOOD|WATER|OTHER), unit, daily_consumption (NUMERIC(14,3) ≥ 0, opcional),
  consumption_basis (HOUSEHOLD|PER_PERSON|PER_ANIMAL)
- stock_batches: inventory_item_id (FK), quantity (NUMERIC(14,3) CHECK ≥ 0), expiration_date
  (DATE, opcional), batch_number, storage_location
- processed_mutations: mutation_id UUID PK, result, processed_at (idempotência do sync)
- Quantidade total NUNCA é armazenada: é derivada dos lotes.

## 2. Regras de cálculo (funções puras, `today` injetado)
Unidades e dimensões:
| unidade | dimensão | base |
|---|---|---|
| kg, g | MASS | g (kg = 1000) |
| L, ml | VOLUME | ml (L = 1000) |
| unidade, pacote, lata, garrafa | COUNT | a própria unidade (COUNT de unidades diferentes nunca se soma) |

- Lote vencido ⇔ `expiration_date < today` (vence hoje = ainda válido). Sem validade = disponível.
- Vence em breve ⇔ `0 ≤ expiration_date − today ≤ 30` (constante `EXPIRY_WARNING_DAYS`).
- `available(item)` = soma dos lotes não vencidos.
- `effective_daily(item)` = `daily_consumption` × (1 se HOUSEHOLD; nº de PERSON; nº de ANIMAL).
  Se `daily_consumption` for nulo/0 ou o multiplicador for 0 → sem consumo → sem autonomia.
- `item_autonomy_days` = `available / effective_daily`, arredondado SEMPRE para baixo (conservador).
- Autonomia agregada (por `item_kind` FOOD/WATER e por dimensão) = Σ available_base /
  Σ effective_daily_base, só com itens que têm consumo. Informar cobertura ("calculado com 7 de 12
  itens") e o `limiting_item` (o que acaba primeiro). Sem nenhum dado → "sem dados", nunca zero.
- Alertas: EXPIRED (CRITICAL, por lote), OUT_OF_STOCK (CRITICAL, available = 0, inclui "tudo vencido"),
  EXPIRING_SOON (WARNING, por lote), LOW_STOCK (WARNING, autonomia < `LOW_STOCK_DAYS`, padrão 7,
  configurável, só quando há consumo), NO_CONSUMPTION_DATA (INFO).
  Ordenar por severidade e depois por data.
- Dashboard: total de itens, pessoas/animais, disponibilidade de alimentos e de água por
  dimensão, lotes vencidos, lotes a vencer em 30 dias e autonomia (food/water).
  O estado de sincronização é responsabilidade do cliente e não integra a resposta do dashboard.

## 3. Sincronização
- Toda escrita do usuário vai para o Dexie + outbox. Mutação:
  `{id (UUID = idempotency key), entity, op: CREATE|UPDATE|DELETE|ADJUST, entity_id, payload, client_ts, attempts}`.
- `client_updated_at` é o timestamp do último cliente que alterou o registro em cada tabela sincronizável.
  O LWW do registro aplica-se quando `mutation.client_ts >= record.client_updated_at`; se o valor do cliente
  for anterior, o resultado da mutação é `stale` e o servidor rejeita a escrita.
- ADJUST = delta de quantidade em um lote ("consumi 2"). O servidor aplica
  `quantity = quantity + delta` atomicamente e rejeita se ficar < 0. Ajustes não sofrem LWW
  (são comutativos); todos os outros updates usam last-write-wins por registro via `client_ts`.
- ADJUST não altera `client_updated_at` do lote. Consumo usa ADJUST; correção manual de
  quantidade usa UPDATE (LWW). Limitação aceita: uma correção absoluta pode sobrescrever ajustes
  concorrentes de outro dispositivo; documentar no README.
- UPDATE ou ADJUST sobre registro com `deleted_at` preenchido resulta em `stale`.
- `POST /api/sync/push`: lista ordenada de mutações; cada uma em sua própria transação;
  idempotente por `mutation.id`. Os resultados possíveis por mutação são
  `applied | duplicate | stale | blocked | rejected(problem)`. O servidor decide
  `applied | duplicate | stale | rejected`; o cliente decide `blocked` para mutações dependentes
  de um `CREATE` rejeitado, que nunca são enviadas ao servidor.
  `rejected` NUNCA some em silêncio: fica numa lista visível "Pendências com erro".
  Caso uma mutação `CREATE` seja rejeitada, as mutações seguintes que dependam dela (mesmo `entity_id`
  ou FK para o mesmo registro) ficam `blocked` e também aparecem em "Pendências com erro".
- `GET /api/sync/pull?cursor=N`: entidades com `change_seq > N` (incluindo tombstones) + novo cursor.
- Gatilhos: evento `online`, abertura do app, `visibilitychange`, após mutação (debounce),
  botão manual. Backoff exponencial com jitter. NÃO depender de Background Sync API.
- Conectividade real = `GET /api/health` com timeout de 3s (não confiar só em `navigator.onLine`).
- Estados: Online | Offline | Sincronizando (N pendentes) | Erro de sync (N falhas),
  mais "última sincronização há X".
- Primeiro uso offline (sem dados locais): estado vazio explicando que o 1º carregamento precisa de rede.
- Limitação aceita: relógios dos dispositivos podem divergir (documentar no README).

## 4. API
Obrigatórios (do escopo original): members, categories, inventory, inventory/{id}/batches,
batches/{id}, dashboard, alerts. Acrescentar: `GET /api/health`, `POST /api/sync/push`,
`GET /api/sync/pull`. Os services são os mesmos do CRUD e do sync (sem duplicar regra).
Decimais como string. Sem paginação (volume pequeno), limite máximo 1000. Erros em Problem Details.
Sem autenticação no MVP: servidor ouve em 127.0.0.1 por padrão, CORS restrito por env, e isso
fica documentado no README.

## 5. Interface
- pt-BR, mobile-first. Navegação lateral no desktop; no celular, menu lateral colapsável
  (sugestão opcional: barra inferior, mais acessível ao polegar).
- Telas: Dashboard, Estoque (tabela, busca, filtro por categoria, detalhe com lotes), Pessoas e
  Animais, Categorias, Alertas.
- Lotes ordenados por validade (FEFO), com selo "consumir primeiro" no mais próximo do vencimento.
- Botão "Consumir" rápido (−1, −0,5, valor livre) com "Desfazer".
- Excluir exige confirmação explícita. Erros críticos não desaparecem sozinhos (nada de toast efêmero).
- Estados loading/empty/error em toda lista. Badge de sync sempre visível.
- Tema: sistema + toggle + modo noturno vermelho (preserva visão noturna; é só um conjunto de CSS variables).
- Exportar/importar backup JSON e visão imprimível "Ficha de emergência" (cópia em papel).

## 6. Testes obrigatórios
- Fixtures em `shared/fixtures/*.json`, consumidos por pytest e por Vitest. Casos de borda:
  vence hoje, ontem, +30, +31; sem validade; zero lotes; tudo vencido; kg+g; L+ml; PER_PERSON
  e PER_ANIMAL com 0 membros; sem consumo; arredondamento para baixo.
- Propriedades (hypothesis): autonomia nunca negativa; lote vencido nunca conta; total = Σ lotes.
- API: quantidade negativa → 422; lote de item inexistente → 404; excluir categoria com itens → 409;
  push repetido não duplica; pull entrega tombstones.
- Frontend: outbox, retry, idempotência, `stale` (Vitest + fake-indexeddb).

## 7. Critério de conclusão (E2E com Playwright)
Subir o sistema → carregar o app online → cortar a rede (`context.setOffline(true)`) →
cadastrar pessoa, animal, item e lote com validade → recarregar offline e ver tudo,
dashboard e alertas corretos → religar a rede → status "Sincronizando" e depois "Online" →
conferir os dados no PostgreSQL.