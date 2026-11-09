---
description: Etapa 5b — Revisão de linguagem, UX e visual
agent: agent
---
Execute SOMENTE a etapa 5b. Leia #file:AGENTS.md, #file:docs/SPEC.md (§2 e §5), as instruções em
.github/instructions/ e docs/decisions/004-sync-cliente.md.

Pré-condição: a etapa 5a está feita (src/domain/goals.ts, useGoals() e a regra da meta no SPEC).
Se não estiver, PARE e me avise.

Objetivo: a interface deve ser compreensível por alguém que NÃO conhece o jargão, rica em
informação útil e visualmente marcante. Foi reprovada no teste manual por ser confusa e genérica.

## Regras
- Só apresentação. NÃO altere banco, API, sync nem regras de negócio (a meta já existe na 5a:
  aqui só se consome). Nenhum cálculo novo só no frontend: ou já existe em src/domain (com
  fixture) ou é pura formatação.
- Nenhum termo técnico na tela: MASS, VOLUME, PER_PERSON, tombstone, outbox, ADJUST, sync.
  "Lote" continua no código; na tela, usar "Estoque por validade" e "Adicionar estoque".
- Dependências permitidas: lucide-react (ícones) e a fonte Atkinson Hyperlegible empacotada via
  @fontsource (confirme o nome exato do pacote no npm). Fontes self-hosted e no precache do
  service worker: PROIBIDO Google Fonts ou CDN, o app precisa abrir offline.
- Antes de codar, registre no próximo número livre de docs/decisions (máx. 40 linhas) os tokens
  (cores nomeadas com hex, tipografia, escala, raio, espaçamento) e o conceito de layout, e revise:
  se o resultado parecer o visual padrão de qualquer dashboard SaaS, mude.

## Direção visual (proposta inicial; ajuste com justificativa)
- Conceito: painel de despensa e de bordo. O elemento memorável é a AUTONOMIA EM DIAS contra a
  META, junto da linha do tempo de validade; o resto fica quieto e disciplinado.
- Cores semânticas fixas: água = azul, comida = ocre, crítico = vermelho, atenção = âmbar escuro,
  ok = verde. Sugestão: texto #17262B, fundo #F2F5F4, primária #0E5A66, água #1B6EA8,
  comida #8A5614, crítico #B3261E, atenção #8F5A00, ok #1F7A4D. Verifique o contraste AA por
  cálculo (teste ou script), não a olho. Tema escuro e noturno vermelho com os MESMOS tokens.
- Tipografia: Atkinson Hyperlegible (legibilidade sob estresse), base 17–18px, números grandes
  (48–64px) para autonomia, font-variant-numeric: tabular-nums. Frases em minúsculas, sem rótulos
  em caixa-alta, sem gradientes decorativos.
- Estrutura: nada de grade de cards idênticos. Dados densos em linhas e tabelas com divisórias;
  cards só para o resumo principal; um filete de cor à esquerda indica água ou comida. Status
  sempre com ícone + texto + cor. Movimento mínimo, só em resposta a ações; respeitar
  prefers-reduced-motion. Sem biblioteca de gráficos: barras e linha do tempo em CSS/SVG.

## Ajuda contextual (ícone de informação)
Crie UM componente reutilizável `InfoTip`, sem dependência: botão com o ícone `Info` que abre um
balão ao passar o mouse, ao receber foco do teclado e ao TOCAR (no celular alterna; tocar fora ou
ESC fecha). Requisitos: `role="tooltip"` com `aria-describedby`; nunca depender só do atributo
`title`; alvo de toque ≥ 48px (ícone pequeno, área grande); o balão não pode sair da tela (inverte
de lado); texto curto (até ~3 linhas), sempre vindo de i18n; aceita conteúdo estruturado (lista de
rótulo e valor). Onde usar, com estes textos:
1. Título "Estoque por validade": "Cada linha é um lote: um grupo do mesmo produto com a mesma
   validade. Se você comprou o arroz em duas datas, são dois lotes."
2. EM CADA LOTE, os detalhes: Quantidade; Vence (data e relativa, ex.: "19/11/2026, em 11 dias");
   Código do lote (omitir se vazio); Guardado em (omitir se vazio); Cadastrado em; Situação
   (dentro da validade, vence em breve, vencido); e, se for o primeiro da fila, "Será usado
   primeiro por vencer antes dos outros."
3. Autonomia: "Quantos dias o estoque dura com o consumo que você informou. Só contam itens com
   consumo informado e lotes dentro da validade."
4. Cobertura ("calculado com 3 de 5 itens"): "Itens sem consumo informado não entram na conta.
   Informe o consumo para uma estimativa mais completa."
5. Meta: "Quantos dias você quer aguentar só com o que tem em casa. Defina em Configurações."
6. Consumo da casa por dia: "O consumo de cada pessoa ou animal multiplicado pela quantidade
   cadastrada."
7. Aviso de item acabando (Configurações): "Avisa quando um item tiver menos dias que este limite."
8. Aviso de armazenamento: o texto da correção 6.

## Correções obrigatórias
1. Plural correto com Intl.PluralRules ("1 item ativo", "2 itens ativos").
2. "Tipo do item" = Alimento | Água | Outro (cartões com ícone), nunca o rótulo do dashboard.
3. Quantidades em unidade amigável: formatQuantity (g→kg a partir de 1000, ml→L), sem MASS/VOLUME.
4. Toda quantidade com unidade; idade como "21 anos"; "Consumir 1 kg", campo com sufixo da unidade.
5. Datas relativas com Intl.RelativeTimeFormat ("vence em 11 dias", "venceu há 2 dias", "hoje")
   junto da data dd/mm/aaaa.
6. Aviso de armazenamento: dispensável (lembrar a escolha em meta), com o texto "Seus dados ficam
   neste aparelho. Instale o app ou exporte um backup de vez em quando."
7. Formulários em painel lateral ou diálogo (foco preso, ESC fecha), não inline.
8. Ficha: título único, A4 em preto sobre branco independentemente do tema.

## Telas
1. Dashboard: topo com "Sua casa: 2 pessoas e 1 animal" e o selo de sync. Herói: duas faixas
   grandes, "Água: N dias" e "Comida: N dias", com barra e uma MARCA NA META (se existir; sem meta,
   barra sem marca), cobertura, "Acaba primeiro: Arroz (8 dias)" e o veredito em palavras e ícone:
   "Meta de 3 dias atingida" ou "Abaixo da meta: faltam 6 L para 3 dias" (com "baseado em X de Y
   itens" quando a cobertura for parcial). Link "Alterar meta" abre um painel pequeno com campo,
   atalhos "3", "7" e "14 dias" (só preenchem o campo, não são padrão) e "Remover meta". Sem meta:
   "Defina quantos dias você quer aguentar" com botão. Sem consumo: botão "Informar consumo", que
   abre o Estoque filtrado por itens sem consumo. Depois: "O que falta para a meta" (ex.: "Água:
   faltam 6 L", com botão "Adicionar estoque"), "Precisa de atenção" (até 5 alertas críticos e de
   atenção com botão de ação), "Vencimentos nos próximos 30 dias" (linha do tempo), "Disponível
   agora" por tipo em unidades amigáveis e o lembrete de backup ("Último backup: nunca").
2. Estoque: tabela no desktop e lista no celular. Colunas: item, categoria, disponível, consumo
   por dia da casa, autonomia (dias + barra), próxima validade, status. Busca, categoria,
   ordenação e filtros rápidos (Todos, Vence logo, Vencidos, Sem estoque, Sem consumo). Ações por
   linha: Registrar consumo e Adicionar estoque. Faixa no topo com o veredito de água e de comida
   contra a meta.
3. Detalhe do item: cabeçalho com o ícone do tipo; quatro medidas (Disponível, Consumo da casa por
   dia, Autonomia, Próxima validade); "Estoque por validade" em ordem FEFO com quantidade,
   validade (absoluta e relativa), local, status, "Consumir primeiro" e o ⓘ de cada lote; botões
   de consumo com unidade e "Desfazer".
4. Formulário de item: tipo em cartões; unidades filtradas pelo tipo (água: L, ml, garrafa);
   consumo em linguagem natural: "Cada [pessoa | animal | a casa toda] consome [__] [unidade] por
   dia", com prévia ao vivo ("Com 2 pessoas: 0,4 kg por dia").
5. Formulário de estoque: quantidade com unidade; validade com atalhos ("Sem validade", "+3 meses",
   "+6 meses", "+1 ano", "+2 anos"); local com sugestões dos já usados (lidos do Dexie); código do
   lote escondido em "Mais detalhes". PRÉVIA AO VIVO usando o domínio com o lote hipotético: "Com
   este estoque, a água passa de 2 para 4 dias (meta: 3) ✓" ou "continua abaixo da meta: faltam
   1,2 L". Depois de criar um item, oferecer "Adicionar estoque agora".
6. Primeiro uso: "Comece por aqui", com checklist calculado pelos dados (quem mora na casa,
   categorias, primeiro item, informar consumo, definir a meta de dias) e o botão "Criar
   categorias sugeridas" (Água, Alimentos, Medicamentos, Higiene, Pets). Só nomes, nunca valores.
7. Alertas: agrupados por gravidade com contagem, texto em linguagem simples, botão "Ver item" e
   "Registrar consumo". O BELOW_GOAL aparece como ATENÇÃO ("Água abaixo da meta: faltam 6 L para 3
   dias") com o botão "Adicionar estoque".
8. Ficha de emergência: resumo (autonomia, disponibilidade e a linha "Meta: 3 dias, atingida" ou
   "abaixo, faltam X"), pessoas e animais com observações, estoque por categoria (quantidade,
   próxima validade, onde está guardado) e alertas críticos.
9. Pessoas e animais: ícone (pessoa ou pata), "21 anos", observações e o aviso de que esses números
   multiplicam o consumo por pessoa ou por animal.
10. Configurações: seção "Metas de autonomia" (Água: __ dias; Comida: __ dias; vazio = sem meta)
    separada de "Aviso de item acabando" (padrão 7 dias), cada uma com o seu ⓘ, mais tema, backup
    e fuso.

## Qualidade
- Responsivo de 360px a desktop, alvos ≥ 48px, foco visível, contraste AA nos 3 temas.
- Testes: atualize ui.test.tsx; novos testes para formatQuantity, plural, datas relativas, idade,
  atalhos de validade, InfoTip (hover, foco, toque, ESC e atributos aria) e os estados da meta
  (sem meta, sem dados, atingida, abaixo, cobertura parcial).
- Com o navegador do Copilot, tire screenshots em 390, 768 e 1280px (Dashboard, Estoque e Detalhe),
  critique o resultado e corrija o que estiver quebrado. NÃO comite os PNG (adicione a pasta ao
  .gitignore).

## Pronto quando
`just frontend-check` e `just backend-check` verdes e o roteiro feito sem consultar documentação:
categoria, item com consumo, estoque, definir meta de 3 dias, ver o aviso "abaixo da meta",
adicionar estoque até atingir, consumir e fazer backup. Não faça commit. Reporte e pare.