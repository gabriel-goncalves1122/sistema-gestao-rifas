# Casos de Uso: Aderido (Vendedor do PDV)

O sistema de rifas não é uma loja pública. Ele funciona como um **Ponto de Venda Privado**, onde apenas o Aderido (Membro da comissão autenticado) tem acesso. O Aderido vende ativamente para o cliente final (amigos, familiares) pelo WhatsApp ou boca-a-boca, cadastra os dados no painel e repassa a cobrança gerada para que o cliente pague.

```mermaid
flowchart LR
    Aderido((Aderido))

    subgraph "Ações do Painel de Vendas"
        UC1(Login SSO com Google)
        UC2(Selecionar Bilhetes Livres na Roleta)
        UC3(Preencher Nome e Telefone do Comprador Terceiro)
        UC4(Gerar Fatura Pix e Copiar o Código QR)
        UC5(Acompanhar Status das Vendas Próprias)
        UC6(Acompanhar Progresso da Meta Individual)
        UC7(Acompanhar Inbox de Notificações)
        UC8(Visualizar Prêmios da Rifa)
    end

    Aderido --> UC1
    Aderido --> UC2
    UC2 --> UC3
    UC3 --> UC4
    Aderido --> UC5
    Aderido --> UC6
    Aderido --> UC7
    Aderido --> UC8
```
