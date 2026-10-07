# Arquitetura e Fluxos do Sistema

Bem-vindo à Fase 2. A documentação arquitetural deste sistema utiliza a metodologia **C4 Model** (Containers e Componentes), UML para os **Casos de Uso** e Diagramas de Sequência (Mermaid) para os **Fluxos de Negócio**.

Navegue pelas pastas de acordo com o nível de abstração que deseja estudar:

- 🏗️ **[C4 Model](./c4-model/)**: Diagramas estruturais estáticos (Quais as caixas do sistema e como elas se comunicam via rede e código).
- 🧑‍💻 **[Casos de Uso](./casos-de-uso/)**: Diagramas comportamentais focados no Ator. O que cada perfil de usuário pode ou não fazer.
- ⏱️ **[Fluxos de Negócio](./fluxos-de-negocio/)**: Diagramas de sequência temporais. Qual o caminho passo-a-passo e condicional de uma ação, como compras ou auditorias.

---

## Visão Geral: C4 Nível 1 (Contexto de Sistema)

Para iniciar, este é o *System Context diagram*. Ele abstrai as engrenagens internas e exibe apenas os Atores e os Sistemas Externos com os quais nosso software conversa diretamente.

```mermaid
C4Context
    title Diagrama de Contexto de Sistema - Plataforma de Rifas
    
    Person(aderido, "Aderido (Vendedor)", "Membro da comissão logado. Cria pedidos para clientes e gerencia meta.")
    Person(tesouraria, "Diretoria (Tesouraria/Admin)", "Aprova estornos, executa apurações, visualiza relatórios e emite PDF das atas.")

    System(sistema_rifas, "Plataforma de Rifas Unifei", "Venda, processamento, geração de links Pix, auditoria financeira e ranking.")

    System_Ext(mercadopago, "Mercado Pago API", "Gateway adquirente (Geração de QR Codes e recebimento de Webhooks).")
    System_Ext(firebase_auth, "Google Identity (Auth)", "SSO de Login com conta @google.com para membros da comissão.")

    Rel(aderido, sistema_rifas, "Lança dados de terceiros, escolhe bilhetes e copia QR Code Pix.")
    Rel(tesouraria, sistema_rifas, "Aprova faturas retidas, cria aderidos e emite balanços.")
    
    Rel(sistema_rifas, mercadopago, "Gera fatura e aguarda liquidação.", "REST/HTTPS")
    Rel(mercadopago, sistema_rifas, "Notifica mudança de status (Pix Pago).", "Webhook")
    
    Rel(aderido, firebase_auth, "Faz login e obtém JWT Token.", "OAuth2")
    Rel(firebase_auth, sistema_rifas, "Valida autenticidade e envia payload de novo usuário.", "OIDC")
```
