# AGENTS.md - Modulo Tesouraria

## Escopo

Este modulo e o dominio backend canonico para tesouraria financeira e processamento de pagamentos.

Ele cobre:

- checkout Pix (geracao de novas cobrancas Pix via backend do sistema);
- webhook Pix assinado e sincronizacao de provedor financeiro externo (Mercado Pago);
- validacao final de transacoes Pix confirmadas pelo banco;
- relatorio financeiro;
- historico/auditoria de compras;
- resumo de transacoes Pix;
- sincronizacao de pagamentos Pix abertos;
- compatibilidade com endpoints financeiros antigos de `rifas`;
- isolamento do legacy OCR/IA/manual de auditoria.

Nao crie integracao direta com provedor externo sem autorizacao explicita.

## Estrutura

```txt
modules/tesouraria/
├── AGENTS.md
├── tesourariaController.ts
├── tesourariaRoutes.ts
├── tesourariaService.ts
├── controllers/
├── helpers/
├── legacy/
│   └── auditoria/
├── routes/
├── schemas/
├── services/
└── types/
```

## Checkout e Webhooks (Gateway)

Documentacao operacional e checklist de homologacao ficam em:

```txt
docs/mercadopago/README.md
docs/mercadopago/agent-guide.md
docs/mercadopago/credenciais.example.md
docs/mercadopago/thunder-client.md
```

Rotas canonicas de gateway (migradas de rifas):

```txt
POST /tesouraria/checkout/pix           (validateToken + validate(checkoutPixSchema))
GET  /tesouraria/checkout/pix/:id       (validateToken)
POST /tesouraria/checkout/pix/webhook   (raw body, assinatura SHA-256 hex)
```

Regras:

- `/checkout/pix` exige `validateToken` + schema validation via yup;
- `/checkout/pix/webhook` nao usa Firebase Auth e valida assinatura por raw body;
  - header oficial: `x-authenticity-token`;
  - algoritmo: SHA-256 hexadecimal de `${MERCADOPAGO_WEBHOOK_TOKEN}-${rawBody}`;
  - nunca reserialize o JSON antes de validar; espacos diferentes invalidam a assinatura.
- o provider externo e `shared/services/mercadoPagoPixClient.ts`;
- credenciais Mercado Pago nunca entram no repositorio; use somente secrets/env do runtime das Functions;
- o checkout reserva rifas como `reservado` ate o banco confirmar;
- cobrancas Pix expiram em cerca de 5 minutos para reduzir reserva longa de rifas;
- banco `PAID`/`AUTHORIZED` muda rifas para `pendente`;
- banco `DECLINED`/`CANCELED` libera rifas e cria notificacao `rifa_liberada`.

**ACID e Guarda de Posse:** tanto o checkout (reserva atomica + criacao do pagamento) quanto o webhook
(atualizacao de status + notificacao) DEVEM usar `runTransaction` do Firestore para
garantir consistencia. Nunca atualize rifas e crie notificacoes em operacoes separadas.
Sempre faça verificação da **Guarda de Posse** via `pix_reference_id` para evitar corrupção de bilhetes (Race Conditions de checkouts concorrentes).

## Rotas E Compatibilidade (Auditoria)

Rotas canonicas de tesouraria:

```txt
GET  /tesouraria/relatorio
GET  /tesouraria/historico
GET  /tesouraria/transacoes-bancarias
GET  /tesouraria/transacoes-bancarias/resumo
POST /tesouraria/transacoes-bancarias/sincronizar
POST /tesouraria/transacoes-bancarias/:transacaoId/aceitar
POST /tesouraria/transacoes-bancarias/:transacaoId/negar
```

Aliases preservados em `rifas`:

```txt
GET /rifas/relatorio
GET /rifas/historico
```

## Pix E Validacao

`PixTransacoesService` deriva transacoes Pix dos bilhetes locais.

Regras atuais:

- usa `status_pagamento_banco` quando existir e preserva fallback legado por `status`;
- agrupa rifas por comprovante, comprador ou compra manual;
- calcula valores com base no valor unitario atual da rifa;
- mapeia `reservado`, `pendente`, `pago` e `recusado` para status Pix estaveis;
- `/sincronizar` consulta cobrancas Pix abertas em `pagamentos_pix` e reaplica o fluxo do webhook;
- a sincronizacao nunca deve expor token Mercado Pago ao frontend;
- `aceitar` exige banco `PAID` ou `AUTHORIZED`, marca rifas como `pago`, grava `status_validacao: "aceita"` e pode enviar recibo aprovado;
- `negar` é uma **Recusa Ativa** de pagamento pela tesouraria. Marca as rifas com o status transacional estrito de `recusado`, grava `status_validacao: "negada"` e cria notificacao `correcao_dados`. 
  - (Nota: Pedidos de correção de dados que não interfiram no pagamento já efetuado devem acionar a flag de `correcao_pendente = true` pelo respectivo módulo/admin, sem alterar o status principal de `pago`).

**ACID:** tanto `aceitar` quanto `negar` DEVEM usar `runTransaction` para garantir que a mudanca de status das rifas e o registro de auditoria ocorram atomicamente. As rifas DEVEM ser lidas dentro do `runTransaction` para prevenir TOCTOU. Nao use `update` individuais separados.

As regras puras de agrupamento, mapeamento, montagem e resumo Pix ficam em `helpers/pixTransacoesHelper.ts`.

O service deve buscar documentos e chamar helpers. Helpers nao devem acessar Firestore/Admin SDK, Express, `Request` ou `Response`.

Validacao da tesouraria fica em `services/pixValidacaoService.ts`; nao coloque regra de aceite/recusa em controllers. Todas as rotas mutaveis de tesouraria requerem validacao Yup em seus roteadores.

## Relatorio E Historico

`TesourariaRelatorioService` e a fonte canonica para:

- relatorio financeiro de aderidos;
- historico detalhado de compras pagas e pendentes.

**Agrupamento:** É responsabilidade exclusiva deste service agregar e cruzar dados brutos (ex: juntar múltiplos bilhetes sob o mesmo CPF de comprador) antes de enviar para o Frontend. O Frontend deve receber o DTO (`TransacaoTesouraria`) já agrupado, para evitar processamento pesado no cliente.

Nao duplique esses calculos em `rifas`. Se precisar manter compatibilidade, use wrappers/delegacao.

## Types

Contratos especificos do modulo ficam em `types/tesourariaTypes.ts` (ou `checkoutPixTypes.ts` para checkout).

Regras:

- status financeiros devem ser valores estaveis;
- valores monetarios permanecem em `number` no contrato atual;
- **CamelCase:** Tipos exportados para o frontend (DTOs como `TransacaoTesouraria`) DEVEM ter propriedades em `camelCase`, abstraindo o `snake_case` do Firestore. A conversão de case deve acontecer no retorno dos controllers ou boundaries;
- nao renomear campos consumidos pelo frontend sem migracao coordenada.

## Legacy De Auditoria

`legacy/auditoria` contem o fluxo OCR/IA/manual antigo.

Regras:

- manter `/auditorias/*` funcionando por wrappers em `modules/auditoria`;
- nao importar legacy em codigo novo, salvo compatibilidade explicita;
- **Reconciliação Manual Abolida:** Processos de conciliação baseados na verificação manual de planilhas/Mercado Pago vs Banco de Dados estão obsoletos. Toda a conciliação depende exclusivamente do webhook `/checkout/pix/webhook` e da auditoria final em `AuditoriaCompras`. Não ressurja a aba de Reconciliação.
- nao misturar OCR/IA/manual com os services novos de Pix;
- preservar testes ao mover ou adaptar qualquer caminho.

## Limites Do Dominio

Nao alterar sem autorizacao explicita:

- Firebase rules;
- Firebase Auth;
- CORS global;
- `.env` ou credenciais;
- integracoes externas sensiveis;
- endpoints de producao sem aliases ou plano de migracao.

## Testes

Testes especificos deste dominio ficam em `backend/functions/tests/tesouraria`.

Siga tambem `backend/functions/tests/AGENTS.md`.
