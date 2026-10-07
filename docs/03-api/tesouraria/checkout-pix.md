# API: Tesouraria - Checkout PIX e Webhooks

Este documento cobre a integração de ponta-a-ponta com o gateway de pagamentos (Mercado Pago).

## 1. Geração de Checkout (QR Code)
**POST** `/api/tesouraria/pix/checkout`  
**Permissão:** Qualquer Aderido Logado

### Request Body
```ts
{
  nome: string;
  telefone: string;
  email: string;
  documento: string;        // CPF/CNPJ obrigatório (Validação de gateway)
  numerosRifas: string[];   // Lista das rifas. Ex: ["0042"]
  sessaoCheckoutId?: string;
}
```

### Response (201 Created)
Devolve os dados para renderização do Pix "Copia e Cola" e/ou a string Base64 do QRCode, juntamente com o ID de rastreio interno que ficará de ouvinte no Firebase.

```json
{
  "sucesso": true,
  "dados": {
    "id": "pix_abc123",
    "status": "aguardando_pagamento",
    "copiaECola": "00020126580014br.gov.bcb.pix...",
    "qrCodeBase64": "iVBORw0KGgoAAAANSUhEUgAAA...",
    "expiraEm": "2024-03-10T15:00:00Z",
    "numerosRifas": ["0042"]
  }
}
```

---

## 2. Webhook Mercado Pago
**POST** `/api/tesouraria/pix/webhook`  
**Permissão:** Pública (Requer assinatura secreta HMAC/Headers do MP)

Endpoint passivo acionado pela API do Mercado Pago sempre que uma fatura muda de status. O backend processa o JSON (com chaves nativas em *snake_case*) e, via uma transação ACID, atualiza o status de todos os bilhetes atrelados àquele `pixOrderId`.

### Request Body (Mercado Pago Nativo)
```json
{
  "action": "payment.updated",
  "api_version": "v1",
  "data": {
    "id": "99999999"
  },
  "date_created": "2024-03-10T14:32:45Z",
  "id": 12345,
  "live_mode": true,
  "type": "payment",
  "user_id": 444444
}
```

### Response (200 OK)
A API responde um 200 genérico sem body para confirmar recebimento e não causar timeout. Em caso de payload irrelevante (ex: ação não mapeada), um HTTP 202 pode ser retornado.

---

## 3. Simular Pagamento Pix (Ambiente de Testes)
**POST** `/api/tesouraria/checkout/pix/:id/simular-pagamento`  
**Permissão:** Role `admin` ou `tesouraria` (Geralmente restrito a ambiente de staging)

Força a aprovação do Checkout Pix sem precisar pagar o QRCode.

### Request Body
*(vazio)*

### Response (200 OK)
Retorna o bilhete mutado para PAGO.

---

## 4. Cancelar Checkout Pix
**POST** `/api/tesouraria/checkout/pix/:id/cancelar`  
**Permissão:** Qualquer Aderido Logado (Dono do bilhete) ou Tesouraria

Libera os bilhetes travados na reserva de volta para a roleta pública.

### Request Body
*(vazio)*

### Response (200 OK)
Liberação confirmada.
