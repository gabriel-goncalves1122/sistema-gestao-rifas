# Fluxo 01: Geração de Venda Pix (PDV)

O grande desafio desta arquitetura é o ambiente de alta concorrência. Se dois Aderidos tentarem reservar a rifa "0042" exatamente no mesmo milissegundo para os seus respectivos clientes, a transação ACID trava o segundo vendedor no Banco de Dados antes mesmo dele disparar o Pix no Mercado Pago.

Vale lembrar que quem faz a venda é o **Aderido** (autenticado), inserindo os dados do Terceiro (Comprador final).

```mermaid
sequenceDiagram
    autonumber
    actor Aderido
    participant App as Frontend (React / Painel)
    participant API as API Express (Tesouraria)
    participant DB as Firestore DB (runTransaction)
    participant MP as Mercado Pago API

    Aderido->>App: Preenche dados do cliente (Nome/Tel) e escolhe números
    App->>API: POST /api/tesouraria/checkout/pix (Header: Bearer Token)

    activate API
    API->>API: Valida Token JWT e Extrai UID do Aderido
    API->>DB: Inicia runTransaction()
    activate DB
    DB-->>API: Lê (get) status físico dos bilhetes no banco

    alt Algum bilhete não está 'livre' (TOCTOU Defense)
        API-->>App: 400 Bad Request (Rifa já reservada por outro colega)
        App-->>Aderido: Exibe erro na tela
    else Todos os bilhetes estão livres
        API->>DB: Atualiza status dos bilhetes para 'reservado'
        API->>DB: Grava o 'donoId' (UID do Aderido que fez a venda)
        API->>DB: Salva os dados de contato do comprador temporariamente
        DB-->>API: Transação Committada (Garantia ACID)
    end
    deactivate DB

    API->>MP: POST /v1/payments {valor_calculado, payload comprador}
    activate MP
    MP-->>API: Retorna 201 Created (QR Code Base64 e Copia-e-Cola)
    deactivate MP

    API->>DB: Injeta a 'pixOrderId' do MP nos bilhetes (Lock de conciliação)

    API-->>App: 201 Created {qr_code_base64, copia_e_cola}
    deactivate API

    App-->>Aderido: Exibe Tela do QR Code no Painel.
    Note over Aderido, App: O Aderido tira print ou copia o código <br/>e manda no WhatsApp para o cliente pagar.
```
