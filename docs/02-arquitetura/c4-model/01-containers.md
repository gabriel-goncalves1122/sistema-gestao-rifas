# C4 Model: Nível 2 (Containers)

No Nível 2 do C4 Model, nós damos um zoom na caixa principal (`Sistema de Rifas Unifei`) e enxergamos as sub-aplicações físicas e infraestrutura que compõem nossa solução. O sistema utiliza a stack de Nuvem Serverless do Firebase (GCP).

```mermaid
C4Container
    title Diagrama de Containers - Sistema de Rifas

    Person(aderido, "Vendedor (Aderido)", "Membro da comissão. Acessa painel logado com SSO.")
    Person(tesouraria, "Diretoria", "Administra o sistema e valida estornos.")
    
    System_Ext(mp, "Mercado Pago", "API de Pix")

    System_Boundary(c1, "Nuvem Firebase (Google Cloud)") {
        Container(spa, "SPA Frontend", "React, Vite, TS, PWA", "Oferece a UI interativa (Módulo PDV), roteamento e consumo das APIs via rede HTTP. Hospedado no Firebase Hosting.")
        
        Container(api, "Backend APIs", "Express.js, Node 20, TS", "Contém as lógicas de negócio cruciais, orquestração Pix e auth. Hospedado no Cloud Functions v2.")
        
        ContainerDb(db, "Firestore", "NoSQL, Multi-Region", "O banco de dados transacional (ACID). Guarda documentos de compras, usuários e logs.")
        
        ContainerDb(storage, "Cloud Storage", "GCS Bucket", "Armazena arquivos ZIP (COMPAC) e atas da secretaria.")
    }

    Rel(aderido, spa, "Lança pedidos, gera Pix e checa inbox", "HTTPS/WSS")
    Rel(tesouraria, spa, "Visualiza painel e relatórios da secretaria", "HTTPS/WSS")
    
    Rel(spa, api, "Faz chamadas de comandos (Vendas, Cadastros)", "JSON/HTTPS")
    Rel(spa, db, "Faz subscrições nativas para Leituras Real-Time", "WebSockets/gRPC")
    
    Rel(api, db, "Faz escritas complexas e runTransaction", "gRPC")
    Rel(api, storage, "Gera ZIP e faz streams de arquivos", "HTTPS")
    
    Rel(api, mp, "Gera faturas e Recebe Webhooks", "HTTPS")
```
