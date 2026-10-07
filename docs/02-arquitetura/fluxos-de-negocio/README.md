# Fluxos de Negócio (Diagramas de Sequência)

Estes diagramas mostram a coreografia passo-a-passo no eixo do tempo (Timelines) entre o Usuário, o Frontend, o Backend, o Banco de Dados e as APIs Terceirizadas. Útil para debugar "por que a transação não gravou?".

### Índice de Fluxos Vitais

- **[01. Checkout Pix (Venda Ativa)](./01-checkout-pix.md)**: O fluxo mais importante. Como o Aderido vende as rifas e garantimos com ACID que dois vendedores não consigam bloquear a mesma rifa milissegundos antes de gerar a cobrança.
- **[02. Conciliação Automática via Webhook](./02-conciliacao-webhook.md)**: O motor passivo que engole as aprovações do Mercado Pago, garante idempotência, e solta os e-mails aos clientes.
- **[03. Onboarding de Aderido (Google Auth)](./04-onboarding-auth.md)**: A engenharia assíncrona por trás do clique no botão "Logar com Google" até o carregamento das Claims.
- **[04. Apuração COMPAC (Ação Crítica)](./05-apuracao-compac.md)**: O snapshot imutável executado na véspera do sorteio, garantindo compliance e travando vendas ilegais de última hora.
