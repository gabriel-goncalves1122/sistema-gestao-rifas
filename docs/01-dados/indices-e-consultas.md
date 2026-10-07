# Índices e Consultas (Firestore)

O Firestore escala infinitamente limitando consultas que exijam múltiplos filtros cruzados (onde ou ordenações), exigindo que **Índices Compostos** (`firestore.indexes.json`) sejam declarados antecipadamente.

## Padrão de Acesso a Dados

O sistema privilegia consultas simples (`==`) para limitar o uso de índices compostos complexos. Entretanto, algumas listagens analíticas no Frontend exigem suporte de índices.

## Índices Compostos Presentes

Os seguintes índices encontram-se declarados para a nuvem. Qualquer adição de query envolvendo múltiplos `.where()` e `.orderBy()` que não conste aqui exigirá deploy de um novo índice (e pode demorar horas para criar na nuvem).

### Coleção `bilhetes`

1. **Listagem Pessoal do Aderido (Ordenado por número)**
   - `vendedor_id` (ASC)
   - `numero` (ASC)
   - *Finalidade:* O vendedor listar todos os bilhetes atrelados à sua conta no painel, ordenados do menor para o maior.

2. **Listagem de Pagamentos Pendentes de um Vendedor**
   - `vendedor_id` (ASC)
   - `status` (ASC)
   - *Finalidade:* Dashboards da UI permitirem ao vendedor filtrar facilmente "Quais dos meus bilhetes não estão pagos ainda?".

### Coleção `pagamentos_pix`

1. **Gestão de Checkouts (Tesouraria)**
   - `status_pagamento_banco` (ASC)
   - `data_criacao` (DESC)
   - *Finalidade:* O painel da tesouraria listar todas as cobranças bancárias que falharam, ou pendentes, das mais recentes para as mais antigas.

2. **Histórico do Comprador**
   - `comprador_id` (ASC)
   - `data_criacao` (DESC)
   - *Finalidade:* Listar a timeline de compras de um CPF específico de forma cronológica.

### Coleção `notificacoes`

1. **Inbox do Vendedor**
   - `vendedor_id` (ASC)
   - `data_criacao` (DESC)
   - *Finalidade:* Trazer os sinos de notificação na header do painel, do mais recente para o mais antigo, exclusivos do usuário autenticado.

---

> [!TIP]
> Caso adicione uma consulta na UI (ex: Buscar bilhetes `vendedor_id == '123'` e `correcao_pendente == true` ordenados por `data`), o console do navegador irá "cuspir" um erro Firebase com um Link. Clique neste link, que abrirá o Firebase Console já no gerador exato para este novo índice. Em seguida, exporte para `firestore.indexes.json`.
