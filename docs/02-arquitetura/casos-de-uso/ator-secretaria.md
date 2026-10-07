# Casos de Uso: Secretaria

A Secretaria é o nível máximo de privilégio administrativo. Eles cuidam da entrada de novos membros e das burocracias jurídicas, como atas de reunião e relatórios legais.

```mermaid
flowchart LR
    Secretaria((Secretaria))

    subgraph "Ações de Secretaria"
        UC1(Login Auth com 'role: admin')
        
        UC2(Cadastrar Novo Membro Aderido na Tabela de Usuários)
        UC3(Fazer Upload de Atas e Documentos)
        UC4(Gerar Arquivo ZIP - COMPAC)
        UC5(Importar Planilha CSV de Aderidos em Lote)
    end

    Secretaria --> UC1
    Secretaria --> UC2
    Secretaria --> UC3
    Secretaria --> UC4
    Secretaria --> UC5
```
