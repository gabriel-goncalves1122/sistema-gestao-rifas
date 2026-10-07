# C4 Model: Nível 3 (Componentes do Backend)

Dando o zoom na caixa `Backend APIs`, nós enxergamos as sub-camadas de rede, middlewares e injeção do Firestore.

```mermaid
C4Component
    title Componentes do Backend (Cloud Functions v2 / Express)

    Container_Ext(spa, "SPA Frontend", "React App")
    Container_Ext(db, "Firestore", "ACID Database")
    
    Component(express, "Roteador Mestre", "Express App", "Ponto de entrada (index.ts).")
    
    Component_Boundary(middlewares, "Middlewares (Shared)") {
        Component(m_auth, "AuthMiddleware", "Verifica JWT e emite Req.User.")
        Component(m_yup, "YupValidator", "Trava Requests mal formados (Erro 400).")
    }

    Component_Boundary(modulos, "Módulos / Features") {
        Component(c_rifas, "RifasController", "Recebe DTO Vendas")
        Component(c_tesouraria, "TesourariaController", "Recebe Webhooks e Admin")
        Component(c_admin, "AdminController", "Gestão de Aderidos e COMPAC")
        
        Component(s_rifas, "RifasService", "Contém runTransaction e validação de lotes")
        Component(s_tesouraria, "TesourariaService", "Integra com MP e lida com chargeback")
    }

    Rel(spa, express, "Chama API REST")
    Rel(express, m_auth, "Passa pela segurança")
    Rel(m_auth, m_yup, "Passa pela validação de esquema")
    
    Rel(m_yup, c_rifas, "Roteia /rifas")
    Rel(m_yup, c_tesouraria, "Roteia /tesouraria")
    
    Rel(c_rifas, s_rifas, "Chama regras de negócio")
    Rel(c_tesouraria, s_tesouraria, "Chama regras de negócio")
    
    Rel(s_rifas, db, "Faz Lock ACID de bilhetes")
    Rel(s_tesouraria, db, "Registra fluxo de caixa")
```
