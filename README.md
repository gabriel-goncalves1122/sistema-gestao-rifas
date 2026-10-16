# 🎟️ Portal da Comissão - Sistema de Gestão de Rifas

![Status](https://img.shields.io/badge/Status-Produção-success)
![Versão](https://img.shields.io/badge/Versão-2.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)


Este sistema nasceu de uma necessidade real de negócio que enfrentei atuando como Diretor de Tesouraria da minha Comissão de Formatura. A gestão manual da venda de rifas para arrecadação de fundos gerava gargalos de controle, lentidão na conferência de pagamentos e risco de inconsistências no fluxo de caixa.

Para resolver esse problema, desenvolvi esta aplicação web com o objetivo de centralizar as vendas, automatizar o controle de pagamentos dos aderidos e gerar total transparência financeira. O projeto foi desenhado para ser intuitivo para os usuários finais e fornecer dados precisos para a gestão do orçamento dos eventos

---

## 🚀 Funcionalidades Principais

### 👤 Área do Aderido
* **Autenticação Segura:** Login protegido com Firebase Authentication.
* **Reserva de Rifas:** Seleção de números com bloqueio de concorrência em tempo real e tempo de expiração customizado.
* **Checkout Integrado:** Modal de pagamento com QR Code PIX dinâmico (Integração Oficial PagBank/Mercado Pago) com baixa automática (Webhooks).
* **Meus Bilhetes:** Visualização do status das compras (Pendente, Pago, Recusado, Expirado).

### 💼 Painel da Tesouraria (Acesso Administrativo)
* **Auditoria de Pagamentos (Versão Legado):** Interface para aprovação manual com visualizador de comprovantes e OCR (Optical Character Recognition) em anexo. A partir da v2.0, o foco é na conciliação via Webhooks.
* **Visão Gráfica (Dashboard):** Acompanhamento de metas de arrecadação, receitas mensais, tickets médios e ranking de vendas.
* **Histórico Detalhado:** Registro imutável de todas as transações, estornos e cancelamentos.
* **Exportação de Dados:** Geração de relatórios financeiros CSV com filtros avançados.

---

## 🛠️ Arquitetura e Tecnologias

O projeto adota uma arquitetura *Serverless*, garantindo alta disponibilidade e custo de manutenção próximo a zero.

**Frontend (Client-Side):**
* [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) - Construção rápida e otimizada da interface.
* [TypeScript](https://www.typescriptlang.org/) - Tipagem estática para maior segurança do código.
* [Material UI (MUI)](https://mui.com/) - Biblioteca de componentes visuais com design responsivo e paleta customizada (Verde Imperial e Dourado).
* [React Hook Form](https://react-hook-form.com/) + [Yup](https://github.com/jquense/yup) - Validação robusta de formulários.
* [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) - Suite de testes unitários e de integração (100% de cobertura nos componentes críticos).

**Backend (BaaS - Firebase):**
* **Firestore Database:** Banco de dados NoSQL em tempo real para controle de estado das rifas.
* **Cloud Functions:** Regras de negócio encapsuladas no backend (Node.js/TypeScript) para garantir a integridade das transações e evitar fraudes.
* **Cloud Storage:** Armazenamento seguro dos comprovantes de pagamento.
* **Hosting:** Distribuição do frontend via CDN global.

---

## 📱 Responsividade e UX
A interface foi projetada com foco em usabilidade móvel (*Mobile-First*). Tabelas de dados complexos (como o histórico de transações) adaptam-se para *Cards* interativos em telas menores, eliminando a necessidade de scroll horizontal, melhorando a acessibilidade e a experiência do utilizador.

---

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos
* Node.js (v18 ou superior)
* CLI do Firebase (`npm install -g firebase-tools`)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sistema-rifas.git
cd sistema-rifas
```

2. Instale as dependências na raiz (instala automaticamente o frontend e o backend):
```bash
npm install
```

3. Inicie os servidores em terminais separados:
```bash
# Terminal 1: Backend e Emuladores do Firebase
npm run dev:backend:local

# Terminal 2: Frontend Vite
npm run dev:vite
```
