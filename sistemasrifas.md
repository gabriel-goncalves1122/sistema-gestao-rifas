# Sistema de Gestão de Rifas & Arrecadação Financeira (UNIFEI)
> **Documento Técnico de Experiência Profissional, Arquitetura e Portfólio de Engenharia**  
> *Base estruturada para confecção de Currículo (CV), LinkedIn e preparação para Entrevistas Técnicas.*

---

## 1. Visão Geral do Projeto e Propósito

### 1.1 Contexto de Negócio
O **Sistema de Gestão de Rifas** é uma plataforma Full Stack corporativa desenvolvida para gerenciar de ponta a ponta as operações financeiras, logísticas e cadastrais da Comissão de Formatura da **Universidade Federal de Itajubá (UNIFEI)**. 

O sistema substituiu controles manuais em planilhas por uma infraestrutura centralizada, segura e automatizada, responsável pela arrecadação de **centenas de milhares de reais** através da emissão, distribuição e venda de milhares de bilhetes de rifas com sorteios vinculados à Loteria Federal.

### 1.2 Principais Objetivos Alcançados
- **Integridade Transacional Absoluta (Zero Double-Spending):** Prevenção de compra simultânea do mesmo bilhete por múltiplos compradores concorrentes.
- **Automação de Pagamentos Instantâneos:** Integração direta com gateway bancário via **Pix Dinâmico (Mercado Pago)** com emissão de QR Code, chave "Copia e Cola" e reconciliação automática em tempo real.
- **Prevenção de Fraudes e Roubo de Cotas (Anti-Theft):** Algoritmo de alocação de faixas sequenciais e contíguas de bilhetes por formando aderido, impedindo que um vendedor comercialize números alheios.
- **Governança Documental e Auditoria Imutável:** Rastreabilidade completa de todas as aprovações, recusas, alterações cadastrais e logs de segurança das transações.
- **Interface Mobile-First:** Experiência nativa em smartphones para formandos e compradores, contornando limitações de safe area (notches) e teclado virtual em tempo real.

---

## 2. Stack Tecnológica Completa

| Camada | Tecnologias & Bibliotecas | Justificativa Arquitetural & Papel |
| :--- | :--- | :--- |
| **Linguagens** | **TypeScript 5.x**, JavaScript (ESNext / Node.js 20 LTS) | Tipagem estática fim a fim (end-to-end type safety) garantindo contratos idênticos entre cliente e servidor. |
| **Backend / API** | **Firebase Cloud Functions v2**, **Express.js 5**, Node.js | Arquitetura Serverless com rotas modulares Express, alta escalabilidade sob picos de acesso e execução isolada. |
| **Banco de Dados** | **Google Cloud Firestore (NoSQL)** | Persistência NoSQL distribuída com suporte a transações ACID (`runTransaction`), indexação composta e subscrições em tempo real. |
| **Autenticação & RBAC**| **Firebase Authentication**, **Custom Claims**, JWT | Autenticação federada com controle rigoroso de papéis (*Super Admin, Tesouraria, Secretaria, Aderido*) validados criptograficamente na borda da API. |
| **Gateway & Finanças** | **Mercado Pago SDK / REST API**, Nodemailer | Emissão de Pix dinâmico, verificação assíncrona por polling/webhooks com compensação transacional e envio de comprovantes por e-mail. |
| **Segurança Backend** | **Helmet**, **Express Rate Limit**, **CORS**, **Yup** | Proteção contra ataques DDoS, injeção de payloads maliciosos, validação estrita de esquemas e sanitização contra spoofing. |
| **Processamento Binário**| **Busboy**, **Tesseract.js (OCR)**, **pdf-parse**, **string-similarity**, **Archiver** | Streaming de arquivos em memória sem tocar em disco, leitura inteligente (OCR) de comprovantes bancários antigos com fuzzy matching e exportação em ZIP. |
| **Frontend / SPA** | **React 18.3**, **Vite 5**, React Router DOM v7 | Renderização rápida com HMR (Hot Module Replacement), divisão de bundles (code splitting) e roteamento declarativo com guardas de navegação. |
| **Design System & UI** | **Material-UI (MUI v5/v7)**, **Emotion**, **Framer Motion 12** | Interface moderna com design tokens customizados, transições suaves, micro-interações táteis e acessibilidade WCAG. |
| **Gestão de Estado** | **TanStack React Query v5**, Context API, Máquina de Estados Finita | Sincronização de cache do servidor, revalidação otimista e controle de estados transacionais de compra. |
| **Analytics & Data Viz**| **Recharts**, **PapaParse** | Dashboards com KPIs de arrecadação em tempo real, gráficos de barras/linhas de vendas temporais e exportação de relatórios em CSV. |
| **Testes Automatizados**| **Jest**, **Supertest**, **Vitest**, **React Testing Library**, **Playwright**, **Firebase Emulators** | Pirâmide de testes abrangente: unitários, de integração, regras de segurança do banco e E2E em navegadores reais. |

---

## 3. Módulos do Sistema e Arquitetura de Domínio

O sistema foi estruturado seguindo princípios inspirados em **Domain-Driven Design (DDD)** e **Clean Architecture**, segregando regras de negócio em módulos coesos e desacoplados:

```
sistema-gestao-rifas/
├── backend/functions/src/modules/
│   ├── tesouraria/       # Conciliação Pix, auditoria, aprovação/recusa e fechamento contábil
│   ├── rifas/            # Venda, reserva, liberação de cotas e distribuição de faixas
│   ├── admin/secretaria/ # Gestão de aderidos, comissão, importação CSV e documentos oficiais
│   ├── premios/          # Vitrine de premiações, fotos e regras do sorteio
│   ├── notificacoes/     # Mensageria interna e avisos de pendências em lote
│   └── auth/             # Verificação de elegibilidade institucional e primeiro acesso
└── frontend/src/features/ # Módulos equivalentes no cliente com UI, hooks e serviços
```

### 3.1 Módulo Tesouraria (Core Financeiro)
- **Conciliação Automatizada:** Monitoramento do status dos pagamentos Pix, confirmando liquidação bancária e liberando bilhetes imediatamente.
- **Painel de Auditoria de Transações:** Visualização consolidada de todas as compras (agrupadas por comprador), filtros por data/status, visualização do payload bruto e download de relatórios contábeis.
- **Aprovação / Recusa Manual de Comprovantes Legados:** Fluxo administrativo com justificativa obrigatória de recusa e notificação automática ao vendedor.

### 3.2 Módulo Rifas & Vendas
- **Carrinho de Compras com Reserva Dinâmica:** Seleção de bilhetes múltiplos com cálculo instantâneo de valor e geração de Pix unificado.
- **Proteção Anti-Theft de Cotas:** Cada formando aderido recebe uma faixa contígua inviolável (ex: bilhetes `00001` a `00120`). A API rejeita transações que tentem vender números fora da faixa atribuída ao vendedor autenticado.
- **Timeout e Liberação Automática:** Bilhetes reservados cujos pagamentos expiraram retornam automaticamente ao status `"disponivel"` com descarte do lock transacional.

### 3.3 Módulo Secretaria & Gestão de Documentos
- **Cadastro e Importação em Lote:** Ingestão de planilhas CSV contendo centenas de formandos, alocando posições sequenciais e faixas de bilhetes sem interrupção de serviço.
- **Ingestão Segura de Documentos Administrativos:** Upload multipart de atas de reuniões, contratos e editais com até 25 MB, armazenados em bucket do Firebase Storage com acesso protegido (streaming via backend).

### 3.4 Módulo Prêmios & Vitrine Interativa
- **Painel Público do Sorteio:** Exibição responsiva dos prêmios cadastrados, fotos em alta resolução, regras de colocação e cronômetro regressivo com cálculo dinâmico de dias restantes.

### 3.5 Módulo Notificações & Mensageria
- **Alertas Operacionais:** Avisos transacionais quando um comprovante necessita de correção de dados ou quando rifas não pagas voltaram para a prateleira de vendas.
- **Processamento em Chunks:** Atualização em lotes de 30 documentos para respeitar os limites operacionais do Firestore.

---

## 4. Principais Desafios de Engenharia & Soluções Arquiteturais

Esta seção resume os problemas técnicos mais complexos enfrentados no projeto e como foram solucionados — **ideal para demonstrar senioridade em entrevistas técnicas**.

### 💥 Desafio 1: Concorrência e Prevenção de Double-Spending em Banco NoSQL
- **O Problema:** Em momentos de sorteio iminente ou alta divulgação, dezenas de compradores tentavam adquirir o mesmo bilhete simultaneamente. Atualizações isoladas no Firestore causavam *Time-of-Check to Time-of-Use (TOCTOU)*, resultando em múltiplos compradores pagando pelo mesmo número.
- **A Solução:** 
  - Centralização de todo o fluxo de reserva dentro de transações atômicas `db.runTransaction()`.
  - Leitura dos documentos de todos os bilhetes desejados **estritamente dentro da transação**.
  - Validação de que o status atual é `disponivel` e gravação de um lock com `pix_reference_id` exclusivo e timestamp de expiração (15 minutos).
  - Caso qualquer bilhete selecionado esteja ocupado, a transação aborta integralmente sem efeitos colaterais.

### 💳 Desafio 2: Orquestração de Pagamentos Pix com Máquina de Estados Finita (FSM)
- **O Problema:** A comunicação com o Mercado Pago envolve atrasos de rede, possibilidade de cliques duplos do usuário, abandono do modal no navegador e atrasos em webhooks bancários.
- **A Solução:**
  - Criação de uma **Máquina de Estados Finita** no Frontend (`usePixStateMachine`) com os estados: `idle` ➔ `gerando` ➔ `aguardando_pagamento` ➔ `sucesso` / `erro`.
  - Implementação de **Mutex de Requisição** no serviço de checkout para bloquear requisições paralelas idênticas.
  - Implementação de chave de **Idempotência UUID** enviada ao Mercado Pago para garantir que nenhuma cobrança seja duplicada no banco.
  - Sincronização híbrida: listener em tempo real (`onSnapshot`) observando a compra no Firestore + polling adaptativo na API externa + fallback via Webhook assíncrono.
  - Cancelamento silencioso via `AbortController` quando o usuário fecha o modal antes da geração do QR Code, evitando ordens órfãs no banco.

### 🛡️ Desafio 3: Segurança em Uploads de Arquivos e Prevenção de File Spoofing
- **O Problema:** Usuários administrativos precisavam anexar contratos, planilhas e imagens de até 25 MB. Clientes com permissões diretas no Firebase Storage representavam risco de segurança, e a validação apenas pela extensão do arquivo (`.pdf`, `.png`) era vulnerável a spoofing de arquivos executáveis maliciosos.
- **A Solução:**
  - Remoção de qualquer acesso direto do cliente Web ao Storage SDK. Todo upload trafega via backend Express através de streaming em memória com `busboy`.
  - Criação de um verificador de **Magic Bytes** (assinatura binária real do buffer): validação de `%PDF-` para PDFs, `0x89 0x50 0x4E 0x47` para PNGs, `0xFF 0xD8 0xFF` para JPEGs e PK zip header para planilhas XLSX.
  - Caso o Firestore falhe após o upload no Storage, é disparada automaticamente uma rotina de rollback/compensação para deletar o arquivo órfão do bucket.

### 📱 Desafio 4: Responsividade Mobile Avançada e Virtual Viewport
- **O Problema:** Em dispositivos móveis (iOS e Android), botões fixos de ação no rodapé (como o "Finalizar Compra" ou FABs) eram cobertos pelo teclado virtual quando o usuário focava em campos de CPF/Telefone, ou colidiam com notches/barras inferiores de navegação.
- **A Solução:**
  - Criação do hook utilitário `useKeyboardHeight` utilizando a API nativa `window.visualViewport` para calcular em pixels o tamanho exato do teclado aberto e empurrar o container para cima.
  - Aplicação obrigatória de design tokens com funções CSS dinâmicas: `max(16px, env(safe-area-inset-top))` e `env(safe-area-inset-bottom)`.

### ⚡ Desafio 5: Performance e Eliminação de Travamentos no Cliente
- **O Problema:** A listagem da tesouraria continha milhares de bilhetes vendidos. O código legado realizava o agrupamento de bilhetes por comprador via JavaScript no navegador do cliente, causando congelamentos da aba do navegador (UI lag de vários segundos).
- **A Solução:**
  - Migração de toda agregação pesada para o servidor (backend Cloud Function). O backend retorna os DTOs em `camelCase` já mastigados, agrupados e paginados.
  - Implementação de cache otimista com `localStorage` para exibição instantânea no carregamento da tela enquanto a subscrição do Firestore sincroniza em segundo plano.

### 📚 Desafio 6: Governança, Testes e Tooling de Cobertura Documental
- **O Problema:** O codebase acumulava funções com regras financeiras implícitas e sem documentação contextual.
- **A Solução:**
  - Estabelecimento de diretrizes canônicas de documentação TSDoc/JSDoc formalizadas no guia global de engenharia (`AGENTS.md`).
  - Criação do script de análise estática `scripts/check-inline-docs.mjs` adicionado ao `package.json` (`npm run check:docs`), elevando a documentação inline de **0.9%** para mais de **32%** com cobertura de 100% das funções financeiras e críticas.
  - Cobertura de testes garantida: **57 test suites e 328 testes unitários no backend** (Jest) e dezenas de suites no frontend (Vitest + React Testing Library).

---

## 5. Bullets Prontos para Currículo (Método STAR)

*Copie e cole diretamente estas seções em seu currículo ou adapte para seu perfil profissional.*

### 📄 Versão em Português (Currículo / LinkedIn)

#### Engenheiro de Software Full Stack | Projeto Sistema de Rifas (UNIFEI)
- **Desenvolveu e arquitetou uma plataforma Full Stack completa de arrecadação financeira** para a comissão de formatura, gerenciando centenas de milhares de reais e milhares de bilhetes de rifas com zero inconsistências contábeis.
- **Implementou garantias ACID de concorrência com Google Cloud Firestore (`runTransaction`)**, eliminando condições de corrida (race conditions/TOCTOU) e bloqueando o double-spending de bilhetes por compradores concorrentes.
- **Construiu uma integração resiliente de Pix Dinâmico com a API do Mercado Pago**, implementando geração de QR Code/Copia-e-Cola, reconciliação via webhooks/polling, chaves de idempotência UUID e máquina de estados finita no frontend.
- **Projetou a arquitetura de autorização baseada em papéis (RBAC)** utilizando Firebase Auth Custom Claims validadas criptograficamente na borda da API para múltiplos níveis de permissão (Super Admin, Tesouraria, Secretaria, Aderido).
- **Criou pipeline seguro de ingestão de arquivos multipart com streaming em memória (Busboy)**, implementando validação de integridade por *magic bytes* binários para prevenir ataques de spoofing de extensão em anexos de até 25 MB.
- **Otimizou a performance de renderização no frontend (React, TypeScript, Vite, MUI)**, transferindo processamento de agregações massivas de dados para o servidor e implementando cache otimista com revalidação em tempo real via listeners do Firestore.
- **Garantiu alta confiabilidade e cobertura de testes automatizados**, mantendo 57 test suites e mais de 320 testes unitários no backend com Jest/Supertest e testes de componentes com Vitest e Testing Library.

---

### 📄 English Version (Resume / Portfolio)

#### Full Stack Software Engineer | Graduation Raffle & Financial Management System
- **Architected and developed an enterprise-grade financial management and raffle platform** handling thousands of concurrent ticket sales and substantial fundraising capital with 100% financial consistency.
- **Engineered ACID-compliant concurrency controls on Google Cloud Firestore (`runTransaction`)**, preventing Time-of-Check to Time-of-Use (TOCTOU) race conditions and completely eliminating ticket double-spending.
- **Integrated dynamic Pix payments via Mercado Pago REST API**, implementing idempotent checkout flows (UUID keys), real-time webhook listeners, fallback polling, and frontend Finite State Machines (FSM).
- **Designed a robust Role-Based Access Control (RBAC) security layer** using Firebase Auth Custom Claims and cryptographically verified JWT tokens across Serverless Express endpoints (Cloud Functions v2).
- **Built a high-security in-memory multipart file upload pipeline (Busboy)** capable of inspecting binary magic bytes to prevent file-extension spoofing attacks on documents up to 25MB without exposing cloud storage buckets.
- **Engineered mobile-first, notch-aware responsive layouts (React 18, TypeScript, Vite, MUI)**, leveraging `window.visualViewport` to dynamically adapt UI components around virtual on-screen keyboards.
- **Maintained a comprehensive automated testing suite**, including 57 Jest test suites with 320+ unit/integration tests on the backend, complemented by Vitest and React Testing Library on the frontend.

---

## 6. Guia de Respostas para Entrevistas Técnicas

Use estes tópicos preparados quando o entrevistador fizer as perguntas clássicas de arquitetura e resolução de problemas:

### P: "Conte-me sobre um problema complexo de concorrência que você enfrentou e como resolveu."
> **Resposta estruturada:**  
> *"No sistema de rifas da UNIFEI, enfrentávamos um cenário clássico de concorrência extrema: durante a divulgação de prêmios, vários compradores tentavam adquirir os mesmos bilhetes ao mesmo tempo. Como o Firestore é um banco NoSQL distribuído, apenas verificar se o bilhete estava livre antes de gravar abria brecha para condições de corrida (TOCTOU).*  
> *Para resolver isso, encapsulei toda a alocação dentro de `runTransaction`. Todas as leituras ocorrem obrigatoriamente dentro do bloco transacional. O bilhete só é reservado se estiver estritamente com status `disponivel`, aplicando um lock temporário atrelado a um ID de pagamento Pix e expiração de 15 minutos. Se qualquer um dos bilhetes do carrinho tiver sido reservado por outro usuário milissegundos antes, a transação aborta de forma atômica sem gerar cobrança no gateway bancário."*

### P: "Como você garantiu a segurança e a integridade de pagamentos na integração com o gateway?"
> **Resposta estruturada:**  
> *"Utilizei três camadas de defesa:  
> 1. **Idempotência:** Toda criação de Pix no Mercado Pago recebe uma chave de idempotência baseada em UUID, impedindo cobranças duplicadas em caso de retransmissão de rede.  
> 2. **Máquina de Estados Finita e Mutex no Frontend:** O hook de checkout bloqueia disparos múltiplos usando mutex e gerencia estados bem definidos (`idle` -> `gerando` -> `aguardando_pagamento` -> `sucesso`).  
> 3. **Reconciliação Confiável:** Não confiei unicamente no webhook bancário, pois chamadas HTTP externas podem falhar. Criei um sistema híbrido com observação em tempo real pelo Firestore, fallback de polling autenticado e tratamento de timeouts com cancelamento compensatório dos bilhetes."*

### P: "Como você garantiu a segurança em uploads de arquivos sem expor credenciais na nuvem?"
> **Resposta estruturada:**  
> *"Nunca permiti que o frontend acessasse diretamente o Firebase Storage SDK com tokens de escrita no cliente. Todos os uploads de atas e contratos trafegam por uma rota autenticada Express multipart usando `busboy`.  
> Em vez de confiar no `Content-Type` ou na extensão `.pdf`/`.png` enviada no header pelo navegador (que pode ser facilmente forjada), implementei uma inspeção de 'magic bytes' no buffer em memória antes de persistir o arquivo. Se um arquivo executável for renomeado para `.pdf`, a assinatura binária discorda e o upload é rejeitado com status 422. Além disso, incluí uma rotina de rollback: se a gravação dos metadados no Firestore falhar após o upload no bucket, o backend remove o binário imediatamente."*

---

## 7. Métricas de Impacto e Diferenciais do Engenheiro

- **100% de Aderência às Leis Arquiteturais Globais:** Implementação de DTOs em `camelCase` na borda da API enquanto o banco opera em `snake_case`, protegendo o desacoplamento de schemas.
- **Zero Vazamento de Memória em Mídia:** Gerenciamento rigoroso de ciclo de vida de URLs temporárias (`URL.createObjectURL` e `URL.revokeObjectURL`) em previews de imagens e documentos.
- **Arquitetura de Testes Robusta:** 57 suites de teste no backend com 328 testes unitários (100% passing) e pirâmide de testes no frontend com Vitest e Playwright.
- **Tooling Próprio de Qualidade:** Criação de scripts de verificação estática de documentação via Node.js para garantir padrões contínuos no ciclo de desenvolvimento.
