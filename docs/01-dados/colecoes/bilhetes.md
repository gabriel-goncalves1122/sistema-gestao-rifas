# Coleção: `bilhetes`

## Propósito
A coleção `bilhetes` é o núcleo do domínio do sistema. Ela representa as rifas individuais comercializadas pela comissão. O seu documento detém o histórico financeiro daquela rifa específica, incluindo qual aderido a vendeu e quem a comprou.

## Identificador
- **ID do Documento**: O número padronizado da rifa (Ex: `"00042"`). 

## Dicionário de Dados

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `numero` | `string` | Número identificador do bilhete (ex: "00042"). |
| `status` | `string` | Estado principal do bilhete (`disponivel`, `reservado`, `pendente`, `pago`, `recusado`). |
| `correcao_pendente` | `boolean` | Flag ortogonal indicando necessidade de correção cadastral, sem alterar o status financeiro. |
| `vendedor_id` | `string` | ID do usuário aderido que realizou a venda. |
| `vendedor_nome` | `string` | (Desnormalizado) Nome do vendedor. |
| `vendedor_cpf` | `string` | (Desnormalizado) CPF do vendedor. |
| `vendedor_email` | `string` | (Desnormalizado) E-mail do vendedor. |
| `comprador_id` | `string` | ID do comprador na coleção `compradores`. |
| `comprador_nome` | `string` | (Desnormalizado) Nome do comprador. |
| `comprador_email` | `string` | (Desnormalizado) E-mail do comprador. |
| `comprador_telefone` | `string` | (Desnormalizado) Telefone do comprador. |
| `data_reserva` | `string` | ISO timestamp do momento da reserva. |
| `data_pagamento` | `string` | ISO timestamp do momento do pagamento efetivo. |
| `data_expiracao` | `string` | Timestamp limite para o pagamento. |
| `sessao_checkout_id` | `string` | ID da sessão no navegador/app. |
| `pix_order_id` | `string` | ID do pedido Pix na coleção `pagamentos_pix`. |
| `pix_qr_code_id` | `string` | ID do QR Code dinâmico do banco (se houver). |
| `pix_reference_id` | `string` | Referência única da transação com o banco. |
| `status_pagamento_banco` | `string` | Mapeamento nativo da operadora/banco (ex: `approved`, `pending`, ou legado `PAID`). |
| `status_validacao` | `string` | Estado para controle da tesouraria (`aceita`, `negada`). |
| `valor_bruto` | `number` | Valor da rifa no momento da venda. |
| `valor_pago` | `number` | Valor de fato desembolsado pelo comprador. |
| `validado_em` | `string` | Timestamp da conferência pela tesouraria. |
| `validado_por` | `string` | ID do membro da comissão que validou a venda. |
| `comprovante_url` | `string` | URL do comprovante manual no Storage (usado como fallback do Pix dinâmico). |
| `log_automacao` | `string` | [LEGADO] Logs textuais gerados pelo serviço legado de OCR. |
| `motivo_recusa` | `string` | Motivo registrado em caso de tesouraria recusar o bilhete. |

## Relacionamentos

- **`vendedor_id`**: Referência lógica para a coleção `usuarios`.
- **`comprador_id`**: Referência lógica para a coleção `compradores`.
- **`pix_order_id`**: Referência lógica para a coleção `pagamentos_pix`.

## JSON de Exemplo (Anonimizado)

```json
{
  "numero": "00042",
  "status": "pago",
  "vendedor_id": "usr_9k3f8d",
  "vendedor_nome": "João da Silva",
  "comprador_id": "comp_1a2b3c",
  "comprador_nome": "Maria de Oliveira",
  "comprador_telefone": "+5535999999999",
  "data_reserva": "2024-03-10T14:30:00Z",
  "data_pagamento": "2024-03-10T14:32:45Z",
  "pix_order_id": "pix_abc123",
  "status_pagamento_banco": "approved",
  "status_validacao": "aceita",
  "valor_bruto": 15.00,
  "valor_pago": 15.00,
  "validado_em": "2024-03-10T18:00:00Z",
  "validado_por": "usr_tesouraria1"
}
```
