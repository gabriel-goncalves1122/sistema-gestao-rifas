# API: Tesouraria - Relatórios Gerenciais

## 1. Relatório de Desempenho de Vendas (Por Aderido)
**GET** `/api/tesouraria/relatorio`  
**Permissão:** Role `admin` ou `tesouraria`

Cruza a coleção de Aderidos com a soma de suas vendas. Utilizado no painel de ranking da tesouraria.

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": [
    {
      "aderidoId": "usr_9k3f8d",
      "nome": "João da Silva",
      "cargo": "vendedor",
      "modalidadeAdesao": "completo",
      "rifasVendidas": 45,
      "totalArrecadado": 675.00,
      "metaVendas": 5000.00
    }
  ]
}
```

---

## 2. Histórico Consolidado (Extrato Geral)
**GET** `/api/tesouraria/historico`  
**Permissão:** Role `admin` ou `tesouraria`

Traz todas as operações (Pagas, Pendentes e Recusadas) no nível de detalhe do `TransacaoTesouraria`.

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": [
    {
      "id": "trans_abc123",
      "dataReserva": "2024-03-10T14:30:00Z",
      "dataPagamento": "2024-03-10T14:32:45Z",
      "vendedorNome": "João da Silva",
      "compradorNome": "Maria Oliveira",
      "status": "pago",
      "comprovanteUrl": null,
      "bilhetes": ["0042", "0043"],
      "valorTotal": 30.00
    }
  ]
}
```

---

## 3. Alterar Status Manual (Aprovação Manual / Legado)
**PATCH** `/api/tesouraria/historico/compras/:compradorId`  
**Permissão:** Role `admin` ou `tesouraria`

Usado para mudar na força bruta o status de um bilhete (normalmente provindo de um comprovante imagem) de `pendente` para `pago` ou `recusado`.

### Request Body
```ts
{
  status: "aceita" | "negada";
  motivo?: string; // Obrigatório se "negada"
}
```

---

## 4. Reenvio de Comprovante Individual
**POST** `/api/tesouraria/historico/compras/:compradorId/reenviar-email-comprovante`  
**Permissão:** Role `admin` ou `tesouraria`

### Request Body
*(vazio)*

### Response (200 OK)
Retorna a confirmação de que o e-mail foi enfileirado para envio.

---

## 5. Notificar Correção de Dados Cadastrais
**POST** `/api/tesouraria/historico/compras/:compradorId/notificar-correcao`  
**Permissão:** Role `admin` ou `tesouraria`

Usado quando a Tesouraria identifica que o pagamento PIX bateu corretamente, porém o Vendedor inseriu o nome ou CPF do comprador de forma muito errada, exigindo retificação antes de liberar o PDF dos bilhetes finais.

### Request Body
*(vazio)*

### Response (200 OK)
Muda a flag `correcao_pendente = true` nas rifas deste pedido e dispara o email.
