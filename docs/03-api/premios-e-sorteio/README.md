# API: Prêmios e Configurações

O Módulo de Prêmios alimenta tanto a parte de gestão administrativa (CRUD de Prêmios e configuração de dados do Sorteio) quanto a tela principal voltada ao Comprador (Landing Page) que exibe as informações abertamente.

## 1. Ler Prêmios Públicos (e Sorteio)
**GET** `/api/premios/publico`  
**Permissão:** Aberto (Público, sem Auth)

Acessado assim que o SPA carrega. Traz as informações de Título do sorteio e todos os prêmios ativos, poupando várias leituras separadas no Firebase.

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": {
    "configuracaoSorteio": {
      "titulo": "Rifa de Computador Gamer",
      "data": "2024-12-15T20:00:00Z"
    },
    "premios": [
      {
        "id": "prem_1",
        "colocacao": 1,
        "nome": "IPhone 15 Pro",
        "descricao": "Aparelho lacrado",
        "ativo": true
      }
    ]
  }
}
```

---

## 2. Listar Todos os Prêmios (Admin)
**GET** `/api/premios`  
**Permissão:** Qualquer Aderido Autenticado

Retorna também os prêmios marcados com `ativo: false` ou em rascunho.

### Response (200 OK)
Retorna array DTO de prêmios crus do Firestore.

---

## 3. Criar Prêmio
**POST** `/api/premios`  
**Permissão:** Role `admin` ou `marketing`

### Request Body
```ts
{
  colocacao: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  imagemUrl?: string; // Salva via bucket separado
}
```

---

## 4. Atualizar Prêmio
**PUT** `/api/premios/:id`  
**Permissão:** Role `admin` ou `marketing`

### Request Body
Todos os campos são opcionais (Partial).

```ts
{
  colocacao?: number;
  nome?: string;
  descricao?: string;
  ativo?: boolean;
}
```

---

## 5. Deletar Prêmio
**DELETE** `/api/premios/:id`  
**Permissão:** Role `admin` ou `marketing`

### Response (200 OK)
Retorna `{ sucesso: true }` confirmando a deleção física do registro de prêmio no Firestore.
