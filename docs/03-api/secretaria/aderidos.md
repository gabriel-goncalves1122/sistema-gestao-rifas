# API: Secretaria - Gestão de Aderidos

Este submódulo é responsável pela gestão de acesso (Onboarding e Offboarding) dos Vendedores ao sistema. Todos os endpoints exigem permissão de `admin`, `presidencia` ou `rh`.

## 1. Listar Aderidos
**GET** `/api/admin/secretaria/aderidos`

Retorna todos os usuários associados à comissão, junto do mapeamento de suas respectivas `Faixas de Rifas` e os resultados agregados de suas vendas.

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": [
    {
      "id": "usr_9k3f8d",
      "nome": "João da Silva",
      "email": "joao.silva@email.com",
      "cargo": "vendedor",
      "statusCadastro": "ativo",
      "modalidadeAdesao": "completo",
      "faixaRifas": {
        "inicio": "0001",
        "fim": "0050"
      },
      "rifasVendidas": 45
    }
  ]
}
```

---

## 2. Cadastrar Novo Aderido (Onboarding)
**POST** `/api/admin/secretaria/aderidos`

Este endpoint NÃO cria uma conta no Firebase Auth. Ele apenas cadastra a "intenção de acesso". Quando o aderido tentar logar via Google, o Trigger do backend cruzará o email enviado neste payload para injetar as credenciais dele no banco de fato.

### Request Body (`PostAderidoRequest`)
```ts
{
  email: string;
  nome?: string;
  curso?: string;
  telefone?: string;
  cargo?: string; 
  modalidadeAdesao?: "completo" | "meio";
}
```

### Response (201 Created)
Gera automaticamente a cota de ingressos baseada na modalidade.
```json
{
  "sucesso": true,
  "mensagem": "Aderido cadastrado com sucesso.",
  "dados": {
    "idAderido": "usr_xpto123",
    "bilhetesGerados": 50,
    "faixaRifas": {
      "inicio": "0051",
      "fim": "0100"
    }
  }
}
```

---

## 3. Atualizar Dados do Aderido
**PUT** `/api/admin/secretaria/aderidos/:id`

Modifica os dados cadastrais (ex: mudar de 'vendedor' para 'tesouraria', ou 'ativo' para 'inativo').

### Request Body (`PutAderidoRequest`)
Todas as propriedades são opcionais (Partial).
```ts
{
  nome?: string;
  telefone?: string;
  cpf?: string;
  cargo?: string;
  statusCadastro?: "pendente" | "ativo" | "inativo";
}
```

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": {
    "idAderido": "usr_xpto123",
    "camposAtualizados": ["cargo", "statusCadastro"]
  }
}
```
