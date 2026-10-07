# Coleções Auxiliares de Infraestrutura

Este documento engloba as coleções auxiliares (internas) do Firestore utilizadas exclusivamente como infraestrutura para controle de concorrência (Locks), restrição de unicidade e numeração sequencial segura em transações ACID.
Elas operam "por baixo dos panos" e não possuem interfaces Typescript exportáveis para a UI, visto que são consumidas exclusivamente pelas Cloud Functions isoladas.

---

## 1. Coleção `contadores`

### Propósito
Garantir o incremento de números sequenciais (como o próximo número da rifa, ou a posição de um aderido na ordem de chegada) de forma unívoca, utilizando o `FieldValue.increment` ou transações.

### Documentos Principais
- **Documento ID: `aderidos`**
  - Guarda a `ultimaPosicao` (número inteiro). Usado para alocar faixas de bilhetes e ranquear novos aderidos.
  - Guarda o `ultimoBilhete` (número inteiro).

### JSON de Exemplo
```json
{
  "ultimaPosicao": 105,
  "ultimoBilhete": 10500
}
```

---

## 2. Coleção `indices_usuarios_email`

### Propósito
O Firebase Auth impede nativamente a criação de contas com e-mails duplicados. Porém, os dados da coleção `usuarios` são gravados em nosso banco Firestore de maneira independente. Para evitar "Race Conditions" e e-mails duplicados a nível de banco de dados, o sistema grava um documento de registro atrelado ao e-mail.

### Mecânica
- **ID do Documento**: O e-mail do usuário (ex: `joao.silva@email.com`).
- Apenas criar o documento dentro de um `runTransaction` já garante, a nível de banco, que se dois scripts tentarem criar o mesmo e-mail simultaneamente, o Firestore rejeitará um deles.

### JSON de Exemplo
```json
{
  "usuarioId": "usr_9k3f8d",
  "criadoEm": "2024-03-10T14:30:00Z"
}
```

---

## 3. Coleção `pagamentos_pix_idempotencia`

### Propósito
Garantir que webhooks enviados em duplicidade pelo banco (Mercado Pago) — por erro ou atraso de leitura de socket — não tentem registrar o mesmo pagamento da rifa mais de uma vez, evitando bugs na meta e soma financeira do vendedor.

### Mecânica
- **ID do Documento**: A `idempotency_key` (um UUID gerado pelo checkout frontend).
- A Cloud Function que cria ou atualiza um pagamento sempre tenta gravar este ID em uma transação. Se ele já existir, o sistema reconhece que aquele fluxo já foi lidado e "desarta" silenciosamente a requisição duplicada com sucesso de `200 OK` (Padrão de Idempotência).

### JSON de Exemplo
```json
{
  "criadoEm": "2024-03-10T14:30:00Z",
  "pix_order_id": "pix_abc123"
}
```
