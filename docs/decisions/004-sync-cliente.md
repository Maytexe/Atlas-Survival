# Decisão 004 — sincronização offline no cliente

- IndexedDB via Dexie é a fonte de verdade; cada escrita local e mutação de outbox
  compartilham uma única transação.
- `client_ts` é monotônico por dispositivo e usa `America/Sao_Paulo` apenas para
  calcular o dia civil; os timestamps continuam em UTC.
- PUSH ordena por sequência local e limita cada requisição a 50 mutações.
- CREATEs com dependências não confirmadas são separados em lotes; rejeições bloqueiam
  mutações posteriores do mesmo registro e FKs de CREATE rejeitados.
- `blocked` é exclusivamente um estado local. O servidor só retorna applied,
  duplicate, stale ou rejected.
- Um resultado stale é removido do outbox, registrado como aviso local e seguido de
  PULL completo desde o cursor zero.
- PULL grava dados e cursor na mesma transação e reaplica mutações pendentes sobre
  cada registro recebido.
- `navigator.locks` serializa ciclos entre abas; IndexedDB com lease é o fallback.
- Falhas de rede e HTTP 5xx preservam pendências; o retry usa backoff exponencial com
  jitter, limitado a 60 segundos.
- O service worker precacheia o shell e exclui `/api` do fallback de navegação; a API
  permanece fora do cache.
