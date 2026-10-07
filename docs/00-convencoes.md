# Convenções e Leis de Arquitetura Globais

Este documento centraliza as diretrizes de engenharia que guiam o desenvolvimento do `sistema-rifas`. Estas regras também constam no `AGENTS.md` para alinhar tanto o time humano quanto os agentes de IA envolvidos no projeto.

## 1. Princípios de Engenharia

O projeto conta com um **Frontend** (React, Vite, TypeScript, MUI) e um **Backend** (Firebase Functions v2, Express, Admin SDK). Privilegiamos as seguintes posturas:
- Faça mudanças pequenas, seguras e testáveis.
- Em caso de grandes refatorações, documente o racional previamente.
- Respeite o **Contexto Local**: sempre consulte as diretrizes (`AGENTS.md` locais) da feature/módulo onde estiver atuando.

## 2. Leis de Arquitetura Inquebráveis

### 2.1 Garantias Transacionais (ACID)
Todas as operações financeiras (reserva, devoluções, webhooks Pix e validação na tesouraria) DEVEM usar o método `runTransaction` do Firestore.
- **Prevenção de TOCTOU (Time-of-Check to Time-of-Use):** É obrigatória a leitura do documento por dentro da transação, garantindo a sua verificação contra concorrência antes de gravar.
- Não devem ser utilizados writes pontuais sem transação para fluxo financeiro envolvendo mais de um documento (como atualizar `pagamentos_pix` e depois `bilhetes`).

### 2.2 Contrato Frontend ↔ Backend (Interface Híbrida)
- O backend exporta as interfaces TypeScript (`Request` e `Response`), e o frontend consome as mesmas, evitando quebras de contrato silenciosas.
- O Firestore opera majoritariamente com `snake_case`, porém o Backend deve fazer a conversão dos DTOs entregues ao Frontend para `camelCase` e vice-versa.
- Quando o contrato for modificado, **obrigatoriamente** atualiza-se o mock de testes no frontend imediatamente.
- APIs utilizam validação robusta por meio da biblioteca **Yup**.

### 2.3 Barrel Policy (Arquivos `index.ts`)
- Features possuem apenas um `index.ts` na raiz, exportando sua casca (componente/hook público).
- Pastas auxiliares (`components/`, `utils/`, `hooks/`) não devem possuir barrels. Os imports devem declarar o caminho exato para não circular dependências.

### 2.4 Utilitários e Clean Code
- Toda lógica agnóstica ou de formatação recorrente (`formatarMoeda`, `sanitizarNome`) deve residir obrigatoriamente na camada `shared/utils/`. Não se deve duplicar formatadores por view.

### 2.5 Responsividade Mobile & Safe Areas
- Componentes fixados (App bars, Sidebars) no layout mobile devem usar CSS Env vars (`env(safe-area-inset-*)`) para afastar o conteúdo dos "notches" e bordas de dispositivos móveis.

### 2.6 Separação de Preocupações de Estado (Financeiro vs Cadastral)
- O status financeiro (`pago`, `pendente`) nunca deve ser sobrescrito por flags derivadas de cadastros imperfeitos (ex: necessidade de reenvio de comprovante `correcao_pendente`).
- **Somente compradores editáveis**: A coleção `compradores` é a Single Source of Truth para edição de dados pessoais. O backend, não o front, cuida da desnormalização desses dados em seus bilhetes respectivos via transação.

### 2.7 Desempenho e Processamento
- Toda a lógica de agregação custosa para relatórios e totais deve estar hospedada no Backend para mitigar o sobre-processamento no cliente e otimizar tempo de resposta.

---

## 3. Padrões de Interface (UI)

### 3.1 Imutabilidade Visual e React
- Componentes não alteram estados vindos da API (ex: `compra.status = 'pago'`). Todo DTO provindo do servidor é lido de forma *read-only*. A re-validação local do estado deve ser feita refazendo a consulta via controller (SWR/React Query).

### 3.2 Smart Components vs Dumb Components
- Componentes em nível de roteamento ou de view gerenciam chamadas à API via Controllers.
- Componentes visuais como botões, cards, dialogos, recebem o **objeto completo** (ex: prop `compra: TransacaoTesouraria`) e callbacks delegando ações para os ancestrais. Não devemos pulverizar dezenas de `strings/numbers` onde se pode passar a abstração inteira.

### 3.3 Ações e Inversão de Controle
- Um componente subjacente (ex: botão *Aprovar*) emite uma intenção de ação disparando evento, não fazendo a requisição API diretamente. O Controller captura, bloqueia repetição, envia, recebe, emite o toast final e recarrega.

## 4. Segurança Preventiva

- Proibido expor senhas/chaves `secrets` hardcoded, ou versionar ambientes de staging/produção abertos.
- Proibida alteração de regras do `firestore.rules` ou rotas de pagamentos externas sem revisão criteriosa e explícita do criador do projeto.
