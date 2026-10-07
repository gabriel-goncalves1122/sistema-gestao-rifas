# API: Rifas (Vendas e Correções)

Este módulo abrange o principal fluxo do usuário (Aderido): a submissão de vendas e o gerenciamento de seus próprios bilhetes vendidos.

Todas as rotas exigem autenticação básica (`Authorization: Bearer <token>`).

## 1. Nova Venda (Checkout)
**POST** `/api/rifas/vender`

Registra o acoplamento entre um Comprador e um array de Rifas pré-reservadas, e inicia o fluxo financeiro.

### Request Body
```ts
{
  nome: string;              // Nome completo do comprador
  telefone: string;          // Telefone de contato
  email?: string;            // Opcional
  numerosRifas: string[];    // Array de strings com os números. Ex: ["0042", "0199"]
  comprovanteUrl: string;    // String de fallback se não for checkout Pix.
}
```

### Response (201 Created)
```json
{
  "sucesso": true,
  "mensagem": "Venda registrada com sucesso.",
  "dados": {
    "ids": ["0042", "0199"]
  }
}
```

---

## 2. Listagem Pessoal
**GET** `/api/rifas/minhas-rifas`

Cruza o Token JWT do Firebase (uid) para listar apenas os bilhetes vinculados ao Aderido logado. O DTO de resposta contém o documento `Bilhete` com todas as propriedades convertidas para `camelCase`.

### Request Body
*(vazio)*

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": [
    {
      "numero": "0042",
      "status": "pago",
      "correcaoPendente": false,
      "vendedorNome": "João da Silva",
      "compradorNome": "Maria Oliveira",
      "valorPago": 15.00
      // ... propriedades de Bilhete
    }
  ]
}
```

---

## 3. Correção de Bilhetes

Estas duas rotas são utilizadas quando um bilhete está marcado com `correcao_pendente = true`, sinalizado pela auditoria ou tesouraria.

### 3.1 Correção com Envio de Novo Comprovante
**POST** `/api/rifas/corrigir`

Usado quando a foto do Pix anexada via fluxo legado foi rejeitada (borrada, cortada).

### Request Body
```ts
{
  nome: string;
  telefone: string;
  email: string;
  comprovanteUrl: string; // Nova imagem válida armazenada no Storage
}
```

### 3.2 Correção de Dados de Digitação
**POST** `/api/rifas/corrigir-dados`

Usado quando o tesoureiro aceitou o comprovante financeiramente, mas recusou o cadastro devido a um erro de digitação do CPF/Nome por parte do Vendedor.

### Request Body
```ts
{
  nome: string;
  telefone: string;
  email?: string;
}
```

### Response (Ambos: 200 OK)
```json
{
  "sucesso": true,
  "mensagem": "Rifas corrigidas com sucesso."
}
```

> [!NOTE]
> As rotas analíticas antigas (`GET /api/rifas/relatorio` e `GET /api/rifas/historico`) foram transferidas arquiteturalmente para o módulo Tesouraria (embora respondam nesta base). Consulte a documentação da Tesouraria.
