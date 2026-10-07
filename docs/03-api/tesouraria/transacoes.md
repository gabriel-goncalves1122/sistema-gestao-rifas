# API: Tesouraria - Transações e Conciliação Pix

As rotas deste submódulo permitem aos administradores visualizarem os registros bancários diretos (faturas do MP) e solicitarem atualizações e estornos forçados contra o gateway.

## 1. Listar Transações Pix
**GET** `/api/tesouraria/pix/transacoes`  
**Permissão:** Role `admin` ou `tesouraria`

### Parâmetros de Query (Opcionais)
- `status`: Filtro por status (ex: `PAID`, `WAITING`)
- `dataInicio`: ISO Timestamp
- `dataFim`: ISO Timestamp
- `metodo`: `PIX`

### Response (200 OK)
Devolve uma listagem mapeada contra o DTO `PixTransacao`.

```json
{
  "sucesso": true,
  "dados": [
    {
      "id": "pix_abc123",
      "pixOrderId": "123456789",
      "metodo": "PIX",
      "statusPagamento": "PAID",
      "valorBruto": 30.00,
      "valorPago": 30.00,
      "moeda": "BRL",
      "dataCriacao": "2024-03-10T14:30:00Z",
      "compradorNome": "Maria Oliveira"
    }
  ]
}
```

---

## 2. Resumo Analítico de Transações
**GET** `/api/tesouraria/pix/transacoes/resumo`  
**Permissão:** Role `admin` ou `tesouraria`

### Response (200 OK)
Devolve o DTO `PixTransacoesResumo` agregando as métricas e o Ticket Médio.

```json
{
  "sucesso": true,
  "dados": {
    "totalRecebido": 15000.00,
    "totalPendente": 500.00,
    "totalCancelado": 100.00,
    "totalErros": 0,
    "quantidadePagas": 500,
    "quantidadeAguardando": 10,
    "quantidadeCanceladas": 3,
    "ticketMedio": 30.00
  }
}
```

---

## 3. Sincronizar/Atualizar Transação Manufalmente (Polling)
**POST** `/api/tesouraria/pix/transacoes/:id/sincronizar`  
**Permissão:** Role `admin` ou `tesouraria`

Força o backend a fazer um `fetch` na API do Mercado Pago para buscar o status em tempo real daquele pedido, ignorando o Webhook. Muito útil para sanar "bilhetes travados".

### Request Body
*(vazio)*

### Response (200 OK)
Retorna `ResultadoSincronizacaoPix`.

```json
{
  "sucesso": true,
  "dados": {
    "sincronizado": true,
    "atualizados": 2,
    "mensagem": "Transação sincronizada e 2 bilhetes atualizados para PAGO."
  }
}
```

---

## 4. Estorno de Transação (Chargeback)
**POST** `/api/tesouraria/pix/transacoes/:id/estornar`  
**Permissão:** Role `admin` ou `tesouraria`

### Request Body
```ts
{
  motivo: string;
}
```

### Response (200 OK)
Confirma que a ordem de devolução do dinheiro foi enviada à adquirente, retornando a transação mutada com `valorEstornado`.

---

## 5. Corrigir Dados do Comprador
**POST** `/api/tesouraria/pix/transacoes/:id/comprador`  
**Permissão:** Role `admin` ou `tesouraria`

### Request Body
```ts
{
  nome: string;
  email?: string;
  telefone?: string;
}
```
