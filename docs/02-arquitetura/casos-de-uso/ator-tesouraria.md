# Casos de Uso: Tesouraria

A Tesouraria opera num nível acima do Aderido. Se o Aderido é o "Vendedor", a Tesouraria é o "Gerente do Banco", lidando com disputas, fraudes e conciliações anômalas (aquelas que o Webhook do Mercado Pago não conseguiu resolver automaticamente).

```mermaid
flowchart LR
    Tesouraria((Tesouraria))

    subgraph "Ações de Tesouraria"
        UC1(Login Auth com 'role: tesouraria')
        
        UC2(Visualizar Relatório de Inadimplência)
        UC3(Sincronizar Pix Pendente Manualmente)
        UC4(Estornar Pagamento Pix - Chargeback)
        UC5(Consultar Log de Auditoria)
    end

    Tesouraria --> UC1
    Tesouraria --> UC2
    Tesouraria --> UC3
    Tesouraria --> UC4
    Tesouraria --> UC5
```
