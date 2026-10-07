# API: Auth e COMPAC (Apuração)

## 1. Autenticação Auxiliar (Verificar Elegibilidade)
**POST** `/api/auth/elegibilidade`  
**Permissão:** Aberto (Mas exige Payload de Email)

O frontend chama este endpoint antes de instanciar o Pop-up do Google Login, para ter certeza de que o e-mail do usuário está pré-cadastrado na base pela secretaria. Isso previne a geração de sujeira no Firebase Auth.

### Request Body
```ts
{
  email: string;
}
```

### Response (200 OK)
```json
{
  "sucesso": true,
  "dados": {
    "elegivel": true,
    "role": "vendedor"
  }
}
```

> [!NOTE]
> A rota legada `POST /api/auth/recuperacao` foi comentada e desativada no código fonte atual, pois o Firebase Auth com Google Account abstraiu a recuperação de senhas.

---

## 2. Completar Registro Pós-OAuth
**POST** `/api/auth/completar-registo`  
**Permissão:** Qualquer Aderido Autenticado

Rota chamada **imediatamente após o Firebase Auth gerar o UID**. Ela varre os documentos da coleção `aderidos_pre_aprovados`, localiza o email do Firebase Auth, e move os dados de Faixa de Rifas e Cargo para a coleção de `usuarios` definitivos.

### Request Body
*(vazio, o servidor pega o email/UID via Token Firebase no Header)*

### Response (200 OK)
```json
{
  "sucesso": true,
  "mensagem": "Registro completado com sucesso e Custom Claims ativadas."
}
```

---

## 3. COMPAC (Comissão de Apuração e Conciliação)
**POST** `/api/admin/compac/gerar`  
**Permissão:** Role `admin` ou `presidencia`

A COMPAC é uma ferramenta executada na véspera do sorteio, responsável por selar o banco de dados e apurar o status de cotas e vendas.

### Request Body
```ts
{
  forcarFechamento: boolean; // Se true, trava todas as vendas ativas no sistema.
}
```

### Response (200 OK)
Gera os logs imutáveis que servem como prova da lisura da base de bilhetes.

```json
{
  "sucesso": true,
  "dados": {
    "snapshotCriado": true,
    "bilhetesValidosTotais": 4500,
    "arquivoGeradoUrl": "https://storage..."
  }
}
```
