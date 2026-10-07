# Coleção: `pagamentos_pix`

## Propósito
A coleção `pagamentos_pix` é responsável por orquestrar checkouts que abrangem a compra de múltiplas rifas de uma vez, integrando o sistema nativo com a API de recebimentos (Mercado Pago ou afim). 

Ela armazena o estado global da ordem de pagamento, o QR Code dinâmico, e lista os bilhetes atrelados àquela transação.

## Identificador
- **ID do Documento**: O identificador interno (ex: "pix_abc123"). 
- O campo `reference_id` age como um link forte (idempotente) com a operadora bancária.

## Dicionário de Dados

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | `string` | O ID interno do documento gerado no momento do checkout. |
| `reference_id` | `string` | Referência única da transação enviada ao banco (Mercado Pago). |
| `comprador_id` | `string` | ID do comprador na coleção `compradores`. |
| `vendedor_id` | `string` | ID do usuário aderido (vendedor). |
| `vendedor_nome` | `string` | (Desnormalizado) Nome do vendedor. |
| `comprador_nome` | `string` | (Desnormalizado) Nome do comprador. |
| `comprador_email` | `string` | (Desnormalizado) E-mail do comprador. |
| `comprador_telefone` | `string` | (Desnormalizado) Telefone do comprador. |
| `comprador_documento` | `string` | (Desnormalizado) CPF/CNPJ do comprador (usado no Pix). |
| `numeros_rifas` | `string[]` | Array de IDs (números) dos bilhetes incluídos neste pagamento. |
| `valor_bruto` | `number` | Valor original do checkout. |
| `valor_pago` | `number` | Valor efetivamente pago detectado pelo webhook. |
| `status_pagamento_banco` | `string` | Status atual perante o banco (ex: `approved`, `pending`, `rejected`, `CRIANDO`, `ERRO_CRIACAO`). |
| `status_validacao` | `string` | Estado para controle da tesouraria (`aceita`, `negada`). |
| `pix_order_id` | `string` | ID interno retornado pelo provedor Pix (se diferir do ID do documento). |
| `pix_qr_code_id` | `string` | ID da string de Copia e Cola. |
| `copia_e_cola` | `string` | O payload textual do PIX Copia e Cola. |
| `qr_code_imagem_url` | `string` | URL externa ou do storage para exibição visual do QR Code. |
| `qr_code_base64` | `string` | String base64 gerada para renderização do QR Code em tela. |
| `data_criacao` | `string` | ISO timestamp do momento de geração. |
| `data_pagamento` | `string` | Timestamp do pagamento efetivado e confirmado. |
| `data_expiracao` | `string` | Prazo máximo (timestamp) antes do PIX se tornar inválido. |
| `validado_em` | `string` | Timestamp da conferência pela tesouraria. |
| `validado_por` | `string` | ID do membro da comissão que validou a venda. |
| `motivo_negacao` | `string` | Motivo inserido pela tesouraria ao recusar manualmente. |
| `raw_mercadopago` | `object` | Snapshot ou raw payload do webhook Mercado Pago para auditoria. |
| `idempotency_key` | `string` | Chave única (UUIDv4) para evitar reprocessamento do webhook ou duplicidade de checkout. |
| `erro_criacao` | `string` | Log de erro capturado no fluxo de inicialização com a API bancária. |

## Relacionamentos

- Aponta para `usuarios` via `vendedor_id`.
- Aponta para `compradores` via `comprador_id`.
- A coleção referida indiretamente é `bilhetes` (onde cada item em `numeros_rifas` aponta para um documento de bilhete cuja FK `pix_order_id` devolve um link para este documento).

## Ciclo de Vida do Pagamento Pix

O pagamento normalmente nasce em `CRIANDO`, avança para `pending` (aguardando leitura do QR Code) e finalmente `approved` (webhook confirma o pagamento). Caso expire no banco, evolui para `cancelled` ou equivalente, disparando o destrancamento dos bilhetes.

## JSON de Exemplo (Anonimizado)

```json
{
  "id": "pix_abc123",
  "reference_id": "ref_1700000000_1234",
  "comprador_id": "comp_1a2b3c",
  "vendedor_id": "usr_9k3f8d",
  "comprador_nome": "Maria de Oliveira",
  "comprador_documento": "11122233344",
  "numeros_rifas": ["00042", "00043"],
  "valor_bruto": 30.00,
  "valor_pago": 30.00,
  "status_pagamento_banco": "approved",
  "status_validacao": "aceita",
  "copia_e_cola": "00020126...5802BR...",
  "qr_code_base64": "iVBORw0KGgo...",
  "data_criacao": "2024-03-10T14:30:00Z",
  "data_expiracao": "2024-03-10T15:00:00Z",
  "idempotency_key": "9d8e7c6b-5a4f-3e2d-1c0b-a9b8c7d6e5f4"
}
```
