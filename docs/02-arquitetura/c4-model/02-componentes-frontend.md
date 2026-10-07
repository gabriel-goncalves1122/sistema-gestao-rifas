# C4 Model: Nível 3 (Componentes do Frontend)

Dando o zoom na caixa `SPA Frontend (React)`, vemos como a aplicação organiza suas *Features* seguindo a arquitetura limpa de separação de domínios.

```mermaid
C4Component
    title Componentes do Frontend (React)

    Container_Ext(api, "Backend APIs", "Serviços de gravação e lógica complexa.")
    Container_Ext(db, "Firestore", "Leituras Real-Time de estado visual.")

    Component(router, "AppRouter", "React Router", "Controla as rotas públicas (Auth) e Privadas (Painel/PDV).")
    
    Component_Boundary(features, "Features (Regras e Views Locais)") {
        Component(f_checkout, "PDV CheckoutModule", "React Components", "Formulário de Venda restrito ao Aderido. Gera Pix para clientes de terceiros.")
        Component(f_painel, "Minhas Rifas", "React Components", "Dashboard do Vendedor e extrato de vendas.")
        Component(f_tesouraria, "Painel Tesouraria", "React Components", "Visão administrativa e ferramentas de estorno/correção.")
    }
    
    Component_Boundary(shared, "Camada Compartilhada (Shared)") {
        Component(s_auth, "Auth Context", "Context API", "Guarda JWT e Role do usuário.")
        Component(s_api, "API Client", "Axios", "Injeta Token nas requests HTTP para Express.")
        Component(s_ui, "Design System", "Material UI", "Componentes visuais puros (Botões, Modais).")
    }

    Rel(router, f_checkout, "Roteia para /vender (Se Autenticado)")
    Rel(router, f_painel, "Roteia para /painel (Se Autenticado)")
    
    Rel(f_checkout, s_api, "Chama API de Pagamento")
    Rel(f_painel, db, "Faz leitura direta da coleção 'rifas' por OwnerID")
    
    Rel(f_tesouraria, s_api, "Chama endpoints restritos")
    
    Rel(s_api, api, "Envia HTTP Request")
```
