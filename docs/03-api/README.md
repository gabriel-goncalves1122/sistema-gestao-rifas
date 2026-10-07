# Hub Central de Contratos (APIs HTTP)

Bem-vindo ao mapeamento de APIs do Backend (Express via Cloud Functions). O sistema adota uma arquitetura em rede onde o Frontend é uma *Single-Page Application* que se comunica exclusivamente via requisições REST JSON com o Backend.

## Padrões Globais

### 1. CamelCase nas Bordas (Essencial)
Enquanto as tabelas do Firestore (conforme mapeado em `docs/01-dados`) guardam colunas puramente em `snake_case`, **todo o tráfego HTTP ocorre com chaves JSON em `camelCase`**. O middleware no backend e os repositórios são os únicos que traduzem isso. Nunca mande ou espere `snake_case` num DTO do frontend, com exceção explícita para as rotas da Secretaria que lidam com documentos.

### 2. Autenticação e Autorização (Token Firebase)
A autenticação primária é feita nativamente via SDK (Login com Google). Depois, o cliente captura o JWT gerado pelo Firebase e o envia no cabeçalho:

```http
Authorization: Bearer <seu_id_token>
```

A autorização é baseada no conceito de *Custom Claims*. O Cloud Function insere a "Role" (ex: `admin`, `tesouraria`, `rh`) dentro do JWT. No backend, middlewares como `requireTesourariaOrAdmin` apenas decodificam esse token para liberar a rota.

### 3. Códigos e Estruturas de Erro (Yup)
Validamos todos os `Request.body` com esquemas rígidos via biblioteca `Yup`. Se uma requisição chegar com dados faltantes ou incorretos, o validador intercepta e devolve um erro HTTP 400 previsível:

```json
{
  "sucesso": false,
  "erro": "Validação de dados falhou.",
  "detalhes": [
    "compradorNome é obrigatório",
    "numerosRifas deve ter ao menos 1 item"
  ]
}
```

---

## Índice de Módulos (Catálogo de Endpoints)

Escolha o domínio que você deseja integrar para consultar os DTOs e as rotas mapeadas de forma exaustiva:

### 🎟️ [Módulo de Rifas (Core)](./rifas/README.md)
*Contratos de vendas, correção e visualização de bilhetes.*

### 💰 [Módulo de Tesouraria](./tesouraria/README.md)
*O motor de checkout Pix, Webhooks, Transações e Relatórios de fechamento.*

### 📂 [Módulo de Secretaria](./secretaria/README.md)
*Backoffice: Admissão de aderidos, controle de cotas (Faixa de Rifas) e Upload de Documentos.*

### 🏆 [Módulo de Prêmios e Sorteio](./premios-e-sorteio/README.md)
*CRUD de prêmios e metadados exibidos na landing page.*

### 🔔 [Módulo de Notificações](./notificacoes/README.md)
*Integração de avisos dinâmicos para a Inbox do usuário.*

### ⚙️ [Módulo Auth e COMPAC](./auth-e-compac/README.md)
*Triggers de onboarding automático e apuração administrativa.*
