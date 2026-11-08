---
applyTo: "frontend/src/**/*.{ts,tsx}"
---
- Estrutura obrigatória: `src/{pages,components,hooks,services,domain,db,store,types,i18n,pwa}`.
- Um componente por arquivo; mantenha cada arquivo com aproximadamente 250 linhas ou menos.
- `src/domain/` contém apenas funções puras e não pode importar React.
- Fluxo: pages → hooks → services (repositories/sync) → Dexie/Axios. Componente nunca chama
  Axios nem Dexie direto.
- Leitura via `useLiveQuery`. Escrita via repository: entidade + outbox na MESMA transação Dexie.
- `src/domain/` são funções puras, sem React, espelhando o backend e testadas com os mesmos fixtures.
- Quantidades com decimal.js. Aceitar "1,5" e "1.5" na entrada; formatar com Intl pt-BR;
  `inputMode="decimal"`.
- Tipos da API gerados do OpenAPI (openapi-typescript). Proibido duplicar tipos à mão e usar `any`.
- Formulários: React Hook Form + Zod.
- Acessibilidade: HTML semântico, labels, alvos de toque ≥ 48px, foco visível, contraste AA,
  `aria-live` no status de sync. Status NUNCA só por cor: ícone + texto + cor.
- PWA: `registerType: 'prompt'` (nunca recarregar sozinho durante uma edição), precache do shell,
  `navigator.storage.persist()` no primeiro load.
- Tema por CSS variables: `prefers-color-scheme` + toggle. Respeitar `prefers-reduced-motion`.
- Todo texto visível vem de `i18n/pt-BR.ts`.