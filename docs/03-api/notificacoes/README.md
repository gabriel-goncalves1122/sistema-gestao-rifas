# API: Notificações

As notificações compõem a "Inbox" ou "Sininho" na interface do Aderido. A tesouraria e a presidência podem gerar notificações sistêmicas, e o aderido pode marcá-las como lidas.

## 1. Ler Inbox Pessoal
**GET** `/api/notificacoes`  
**Permissão:** Qualquer Aderido Autenticado

Retorna os avisos direcionados ao ID do usuário autenticado no token (ou avisos classificados como globais).

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": [
    {
      "id": "notif_8a9b",
      "tipo": "venda_aprovada",
      "titulo": "Sua venda foi validada!",
      "mensagem": "A venda de 5 bilhetes para Maria Oliveira foi confirmada pelo MP.",
      "lida": false,
      "dataCriacao": "2024-03-10T14:40:00Z",
      "acaoUrl": "/minhas-rifas"
    }
  ]
}
```

---

## 2. Marcar Lidas
**PUT** `/api/notificacoes/ler`  
**Permissão:** Qualquer Aderido Autenticado

Usado para marcar uma ou múltiplas notificações (ou todas) como lidas de uma só vez, desligando a flag vermelha da interface do usuário.

### Request Body
```ts
{
  ids?: string[]; // Se ausente, marca TODAS as notificações do usuário como lidas
}
```

### Response (200 OK)
```json
{
  "sucesso": true,
  "mensagem": "Notificações atualizadas."
}
```
