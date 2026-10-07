# Fluxo 02: Conciliação Automática via Webhook

Uma vez que o Aderido repassa o Pix gerado e o cliente o paga no seu aplicativo de banco, o Mercado Pago precisa avisar o nosso backend de que o dinheiro caiu. Ele faz isso de forma invisível, batendo num endpoint público da nossa API (o Webhook).

Neste meio tempo, as rifas ficaram no estado `reservado` para que ninguém mais as compre. As cobranças têm validade (normalmente 5 minutos) para evitar trancar bilhetes para sempre. 

O perigo principal do Webhook é a **retentativa (retry)**: O Mercado Pago às vezes manda o mesmo webhook duas vezes por instabilidade. Por isso, usamos o padrão de Idempotência.

```mermaid
sequenceDiagram
    autonumber
    participant Cliente as Cliente (Via App Bancário)
    participant MP as Mercado Pago (External)
    participant API as Webhook (/checkout/pix/webhook)
    participant DB as Firestore (Idempotência e DB)
    participant Mail as Modulo Nodemailer

    Cliente->>MP: Paga o Pix via app do banco
    activate MP
    MP-->>Cliente: Comprovante de Pagamento do Banco
    deactivate MP

    MP->>API: POST evento 'payment.updated'
    activate API

    API->>API: Valida Header de Assinatura Criptográfica
    API->>API: Extrai ID do Pagamento do Payload

    API->>MP: GET /v1/payments/{id} (Double Check Oficial)
    activate MP
    MP-->>API: Retorna 'status: approved' e 'transaction_amount'
    deactivate MP

    API->>DB: Inicia runTransaction()
    activate DB
    DB-->>API: Lê se 'pagamentos_pix_idempotencia/{id}' existe

    alt O evento já foi processado (Idempotência)
        API->>DB: Aborta transação
        API-->>MP: 200 OK (Ignora silenciosamente, evita duplicar)
    else É Inédito
        API->>DB: Cria registro na 'pagamentos_pix_idempotencia'
        API->>DB: Altera status dos Bilhetes de 'reservado' para 'PAGO'
        API->>DB: Crava transação no histórico da Tesouraria
        DB-->>API: Transação Committada
    end
    deactivate DB

    API-xMail: [Assíncrono] Dispara E-mail com PDF dos Bilhetes pro Cliente
    API-->>MP: 200 OK (Para de mandar retry)
    deactivate API
```
