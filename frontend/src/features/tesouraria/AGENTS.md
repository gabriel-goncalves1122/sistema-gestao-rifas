# AGENTS.md - Tesouraria Pix

## Escopo

Este guia vale para tudo dentro de `frontend/src/features/tesouraria`.

A área oficial de transações financeiras da tesouraria e Pix. Use `Pix` em arquivos, símbolos, componentes, hooks, services, utils, mocks e textos de UI dessa área. Não use nomes de provedores externos em novos arquivos, símbolos ou copy da feature.

Não altere backend, autenticação, regras do Firebase, `.env.local` ou integrações sensíveis sem autorização explícita.

## Árvore canônica

```txt
frontend/src/features/tesouraria/
├── AGENTS.md
├── components/
│   ├── auditoriaCompras/
│   │   ├── desktop/
│   │   ├── mobile/
│   │   └── shared/
│   ├── desempenho/
│   │   ├── desktop/
│   │   ├── mobile/
│   │   └── shared/
│   ├── layout/
│   ├── pix/
│   │   ├── layout/
│   │   ├── tabs/
│   │   └── transacoes/
│   │       ├── desktop/
│   │       ├── mobile/
│   │       └── shared/
│   └── shared/
├── hooks/
├── legacy/
│   ├── compat/
│   └── ia/
├── mocks/
├── pages/
├── services/
├── styles/
├── types/
└── utils/
```

## Papel das pastas

- `pages`: composição final das telas e ligação entre layout, tabs e controllers.
- `components`: somente UI. Componentes não chamam backend, não conhecem endpoints e não concentram regra de negócio.
- `components/layout`: shell geral da tesouraria, responsividade e containers comuns.
- `components/shared`: componentes reutilizáveis entre domínios da tesouraria.
- `components/pix/layout`: cabeçalho, navegação e estrutura visual da área Pix.
- `components/pix/tabs`: conteúdo das abas Pix (Visão Geral consolidada sem KPIs redundantes, Validar transações, Aderidos).
- `components/pix/transacoes`: tabela, cards, filtros, resumo e estados visuais das transações Pix.
- `components/auditoriaCompras`: UI do histórico/auditoria de compras com badges de canal (`AuditoriaOrigemChip`) e pendências (`AuditoriaCorrecaoChip`).
- `components/desempenho`: UI de desempenho com gráficos empilhados por canal e ranking de vendedores. `shared` contém apenas componentes visuais.
- `hooks`: controllers de tela e hooks de estado. Controllers orquestram service, filtros, loading e callbacks.
  - `useRelatorioTesouraria`: hook compartilhado que consome `/tesouraria/relatorio` via React Query e serve Desempenho e Aba Aderidos.
- `services`: chamadas ao backend do sistema. Services normalizam payloads, mas não implementam UI.
  - `relatorioTesourariaService`: service canônico para `/tesouraria/relatorio`.
- `types`: contratos TypeScript compartilhados do domínio (`auditoriaCompras.ts`, `desempenho.ts`, `pixTransacoes.ts`, `pixVisaoGeral.ts`, `pixTabs.ts`).
- `utils`: regras puras, agrupamentos, filtros, formatadores e exportações sem efeito colateral.
- `styles`: objetos sx compartilhados (cores, tipografia, superfícies, componentes).
- `mocks`: dados locais de desenvolvimento/teste, sem credenciais e sem contrato sensível real.

## Domínios

### Pix & Visão Geral Consolidada

Use `Pix*`, `usePix*`, `pix*Service`, `pix*Utils`, `pix*Types` para a área Pix.

Regras:
- manter transações em `components/pix/transacoes`;
- manter abas em `components/pix/tabs`;
- manter header e navegação em `components/pix/layout`;
- **Visão Geral Consolidada (`PixResumoConsolidado`)**: A aba de Visão Geral exibe diretamente a consolidação de canais (Total Geral Consolidado, Pix Automatizado e Comprovantes Manuais) e o gráfico de evolução temporal. Não duplicar cartões soltos de KPIs no topo.
- `usePixController` controla a página Pix e integra `useRelatorioTesouraria` para alimentar a aba Aderidos;
- `usePixTransacoes` controla carregamento, filtros e sincronização de transações;
- `pixTransacoesService` é o único ponto da feature para consultar dados Pix no backend;
- **Aba Aderidos**: Prioriza o ranking de aderidos vindo do servidor (`adaptarAderidosDoRelatorio`), com fallback transparente para agrupamento local (`agruparPixAderidos`);
- **Estado de Validação Manual**: Transações pendentes (`WAITING`) são bloqueadas na UI para aprovação manual. Apenas transações confirmadas bancariamente (`PAID` ou `AUTHORIZED`) exibem ações de conciliação.

### Auditoria De Compras

Use `AuditoriaCompras*` para coleções/telas e `AuditoriaCompra*` para item individual.

Regras:
- componentes desktop em `components/auditoriaCompras/desktop`;
- componentes mobile em `components/auditoriaCompras/mobile`;
- dialogs, resumo, filtros agregadores, status e ações em `shared`;
- **Chips e Badges**:
  - `AuditoriaOrigemChip`: identifica se a compra originou-se de Pix Automatizado ou Comprovante Manual;
  - `AuditoriaCorrecaoChip`: sinaliza quando `correcaoPendente === true`;
- **Valores Líquidos vs Brutos**: Valores são apresentados com destaque no valor líquido (após dedução de taxas Pix) e valor bruto em legenda secundária quando houver divergência;
- **Filtros e CSV**: Filtros suportam status, canal de origem (Todas/Pix/Comprovante), pendência de correção e busca por comprador, vendedor, rifa ou ID do pedido Pix. A exportação CSV inclui todas essas colunas.

### Desempenho

Use `Desempenho*` para componentes e contratos do domínio.

Regras:
- gráficos empilhados discriminam arrecadação diária por canal (Pix vs Comprovante);
- tabela no desktop e lista de cartões no mobile exibem o ranking completo de aderidos com percentual de meta atingido e busca rápida integrada;
- consumo unificado através do `relatorioTesourariaService`.

## Padrões de Arquitetura e Contrato

- **CamelCase em DTOs**: O backend retorna DTOs em `camelCase`. O frontend consome esses mesmos tipos.
- **TSDoc Obrigatório**: Todas as funções, métodos, hooks e componentes exportados devem ter bloco TSDoc canônico com `@param`, `@returns` e descrição de propósito.
- **Testes Sempre Atualizados**: Mocks e testes unitários acompanham qualquer alteração de contrato simultaneamente.

## Comandos Úteis

```bash
cd frontend
node node_modules/vitest/vitest.mjs run tests/features/tesouraria
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
```
